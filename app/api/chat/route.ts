import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveCallerApiKey } from "@/lib/byok/key-resolution";
import { recordUsage } from "@/lib/usage/meter";
import { flushUsageInBackground } from "@/lib/usage/server-flush";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { thinkingConfig } from "@/lib/gemini/model-config";
import {
  parseChatMode,
  parseThinkingChoice,
  resolveChatMode,
  resolveLegacyChatModel,
  defaultThinkingForMode,
  type ChatModeId,
  type ThinkingChoice,
} from "@/lib/chat-modes";
import { splitChunkParts } from "@/lib/gemini/chat-stream";
import {
  extractGroundingSources,
  groundingTools,
  mergeGroundingSources,
  type GroundingSource,
} from "@/lib/gemini/grounding";
import {
  attachmentsToInlineDataParts,
  validateAttachments,
  type ChatAttachmentInput,
} from "@/lib/chat-attachments";
import { encodeChatEvent } from "@/lib/chat-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "CanceledError")
  );
}

type ChatRequestBody = {
  prompt?: unknown;
  /** Legacy raw model id (pre-Wave 2 clients). */
  model?: unknown;
  mode?: unknown;
  thinking?: unknown;
  /** Web grounding on/off. Defaults to true when absent. */
  web?: unknown;
  /** Opt in to the NDJSON event protocol; default streams plain text. */
  events?: unknown;
  /** BYOK: use the caller's own stored Gemini key instead of shared. */
  useOwnKey?: unknown;
  attachments?: unknown;
};

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "chat", 30, 60_000);
  if (limited) return limited;

  let body: ChatRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt is required." },
      { status: 400 }
    );
  }

  // Resolve mode + thinking. A legacy `model` id translates to its
  // equivalent mode + thinking; a `mode` field wins over `model`.
  let modeId: ChatModeId | undefined;
  let thinking: ThinkingChoice | undefined;

  if (typeof body.mode === "string") {
    modeId = parseChatMode(body.mode);
  }

  const parsedThinking = parseThinkingChoice(body.thinking);
  if (parsedThinking) thinking = parsedThinking;

  if (modeId === undefined && typeof body.model === "string") {
    const legacy = resolveLegacyChatModel(body.model);
    if (!legacy) {
      return NextResponse.json(
        { error: "This model is not available." },
        { status: 400 }
      );
    }
    modeId = legacy.modeId;
    thinking = thinking ?? legacy.thinking;
  }

  const resolved = resolveChatMode(
    modeId ?? "smart",
    thinking ?? defaultThinkingForMode(modeId ?? "smart")
  );

  const webEnabled = body.web !== false;
  const eventsEnabled = body.events === true;

  const validatedAttachments = validateAttachments(body.attachments);
  if (!validatedAttachments.ok) {
    return NextResponse.json(
      { error: validatedAttachments.error },
      { status: 400 }
    );
  }
  const attachments: ChatAttachmentInput[] = validatedAttachments.attachments;

  // BYOK: the caller's own key when they asked for it and one is stored,
  // else the shared server key. The client only ever sends the boolean
  // flag — the key itself never leaves this route.
  const resolvedKey = await resolveCallerApiKey(request, {
    useOwnKey: body.useOwnKey === true,
    sharedKey: process.env.GEMINI_API_KEY,
  });

  if (!resolvedKey.key) {
    return NextResponse.json(
      { error: "Gemini API key is not configured." },
      { status: 500 }
    );
  }

  // Quota meter: count this request (hourly-aggregated, never per-request
  // rows) and flush the staging buckets in the background.
  const callerIdentity = resolvedKey.userId
    ? `user:${resolvedKey.userId}`
    : `ip:${getClientIp(request)}`;
  recordUsage("chat", callerIdentity);
  flushUsageInBackground(request);

  const client = new GoogleGenerativeAI(resolvedKey.key);
  const tools = groundingTools(webEnabled);
  const modelChain = [resolved.modelId, resolved.fallbackModelId];

  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let emittedAnything = false;
      let lastError: unknown = null;

      const emitText = (text: string) => {
        if (!text) return;
        emittedAnything = true;
        controller.enqueue(
          encoder.encode(
            eventsEnabled
              ? encodeChatEvent({ t: "text", text })
              : text
          )
        );
      };

      const emitThinking = (text: string) => {
        if (!text) return;
        emittedAnything = true;
        if (eventsEnabled) {
          controller.enqueue(
            encoder.encode(encodeChatEvent({ t: "thinking", text }))
          );
        }
        // Plain-text mode never receives thought parts: thinking is
        // only requested when the client will display it.
      };

      // Fallback chain: a model that fails BEFORE emitting anything
      // falls through to the next model. Once output has started,
      // restarting would duplicate it, so the error is surfaced
      // instead (same rule as the build stream).
      for (const modelId of modelChain) {
        if (request.signal.aborted || cancelled) break;

        const model = client.getGenerativeModel({
          model: modelId,
          generationConfig: {
            ...thinkingConfig(
              resolved.thinkingLevel,
              resolved.includeThoughts
            ),
          },
          ...(tools.length > 0 ? { tools } : {}),
        });

        try {
          if (request.signal.aborted || cancelled) break;

          const result =
            attachments.length > 0
              ? await model.generateContentStream({
                  contents: [
                    {
                      role: "user",
                      parts: [
                        ...attachmentsToInlineDataParts(attachments),
                        { text: prompt },
                      ],
                    },
                  ],
                })
              : await model.generateContentStream(prompt);

          if (request.signal.aborted || cancelled) break;

          let sources: GroundingSource[] = [];

          for await (const chunk of result.stream) {
            if (request.signal.aborted || cancelled) break;

            // NEVER chunk.text() here: it concatenates thought parts
            // into the visible answer. Split the raw parts instead.
            const { thinking, text } = splitChunkParts(chunk);
            emitThinking(thinking);
            emitText(text);

            if (webEnabled) {
              sources = mergeGroundingSources(
                sources,
                extractGroundingSources(chunk)
              );
            }
          }

          if (request.signal.aborted || cancelled) break;

          // Stream finished cleanly on this model — no fallback.
          if (eventsEnabled) {
            if (sources.length > 0) {
              controller.enqueue(
                encoder.encode(
                  encodeChatEvent({ t: "sources", sources })
                )
              );
            }
            controller.enqueue(
              encoder.encode(encodeChatEvent({ t: "done" }))
            );
          }

          controller.close();
          return;
        } catch (error) {
          if (cancelled || request.signal.aborted || isAbortError(error)) {
            try {
              controller.close();
            } catch {
              // Stream may already be closed.
            }
            return;
          }

          lastError = error;
          console.error("Gemini stream error:", error);

          // Output already started: surface the failure, don't retry
          // (a retry would duplicate the partial answer).
          if (emittedAnything) {
            try {
              if (eventsEnabled) {
                controller.enqueue(
                  encoder.encode(
                    encodeChatEvent({
                      t: "error",
                      message:
                        "The response was interrupted. Please try again.",
                    })
                  )
                );
              } else {
                controller.enqueue(
                  encoder.encode(
                    "\n\n[An error occurred while generating the response.]"
                  )
                );
              }
              controller.close();
            } catch {
              // Client may have disconnected.
            }
            return;
          }

          // Nothing emitted yet: fall through to the next model.
          console.warn(
            "[ANVIX CHAT] Model failed before emitting, trying fallback",
            { model: modelId }
          );
        }
      }

      // Every model failed before emitting anything (or aborted).
      if (cancelled || request.signal.aborted) {
        try {
          controller.close();
        } catch {
          // Stream may already be closed.
        }
        return;
      }

      console.error(
        "Gemini chat failed on all models:",
        lastError
      );

      try {
        if (eventsEnabled) {
          controller.enqueue(
            encoder.encode(
              encodeChatEvent({
                t: "error",
                message: "Failed to generate response. Please try again.",
              })
            )
          );
        } else {
          controller.enqueue(
            encoder.encode(
              "[An error occurred while generating the response.]"
            )
          );
        }
        controller.close();
      } catch {
        // Client may have disconnected.
      }
    },

    async cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": eventsEnabled
        ? "application/x-ndjson; charset=utf-8"
        : "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
      // Which key served this request ("byok" | "shared") — debugging aid,
      // not a secret: it never reveals the key itself.
      "X-ANVIX-Key-Source": resolvedKey.source,
    },
  });
}

import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveCallerApiKey } from "@/lib/byok/key-resolution";
import { recordUsage } from "@/lib/usage/meter";
import { flushUsageInBackground } from "@/lib/usage/server-flush";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { thinkingConfig } from "@/lib/gemini/model-config";
import { classifyGeminiFailure } from "@/lib/gemini/fallback";
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
  shouldDegradeGrounding,
  type GroundingSource,
} from "@/lib/gemini/grounding";
import {
  attachmentsToInlineDataParts,
  validateAttachments,
  type ChatAttachmentInput,
} from "@/lib/chat-attachments";
import { encodeChatEvent } from "@/lib/chat-events";
import { getAuthedServerContext } from "@/lib/supabase/server-auth";
import {
  buildSystemPrompt,
  MAX_ASSISTANT_INSTRUCTIONS_CHARS,
  parseAssistantMode,
} from "@/lib/assistants";
import {
  selectRelevantMemories,
  type MemoryRecord,
} from "@/lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Artifact format instruction (report §20). Short and conditional:
 * the model only emits an artifact block when the user asked for
 * something interactive (widget, chart, calculator, mini-app, game,
 * visual demo). Plain code the user asked to see as code stays a
 * normal fenced block — artifact blocks are extracted out of the
 * reply text by the client, so emitting one unbidden would hide
 * code the user wanted to read.
 */
export const ARTIFACT_SYSTEM_INSTRUCTION =
  "When the user asks for something interactive (a widget, chart, " +
  "calculator, mini-app, game, or visual demo), you MAY return it as " +
  "one fenced block marked ```artifact:html with an optional " +
  'title="..." attribute, containing a single complete self-contained ' +
  "HTML document with inline CSS/JS only and no external URLs. Keep " +
  "the surrounding reply short. Do not use artifact blocks for plain " +
  "code, and never emit more than 3 artifact blocks in one reply.";

// First-token deadline: if the primary has not emitted anything
// within 8 s, the fallback starts in parallel and the first to emit
// wins. Only a SLOW primary ever races — a 429 fails fast and takes
// the serial fallback path instead, so two concurrent calls never
// share one exhausted quota.
const FIRST_TOKEN_DEADLINE_MS = 8_000;
// Model-health short-circuit window: a model that 429'd within the
// last 60 s is skipped in favour of the fallback-first order.
const MODEL_429_COOLDOWN_MS = 60_000;

const FALLBACK_WORTHY_STATUSES = new Set([429, 500, 502, 503, 504]);

// Per-instance last-429 timestamps (same limitation as the rate
// limiter's maps: warm instances benefit, cold starts pay one check).
const last429AtByModel = new Map<string, number>();

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
  /** Id of a saved assistant (owned by the caller, or public). */
  assistantId?: unknown;
  /**
   * Inline assistant (guest path: starters, or a not-yet-saved draft).
   * A saved assistant loaded by `assistantId` always wins over this.
   */
  assistant?: unknown;
};

/** Best-effort helper: a failed context query yields null, never a 500. */
async function quietly<T>(
  promise: PromiseLike<T>
): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

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

  // Mode + thinking are finalised after the assistant loads below
  // (an assistant's preferred mode wins over the mode picker).

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

  // --- Custom assistants + custom instructions + memory v2 ----------
  // Best-effort context for the system prompt. Guests skip it entirely;
  // signed-in users get: their global custom instructions (v1 base
  // layer), the selected assistant's instructions (+ its preferred
  // mode, which wins over the mode picker), and memories relevant to
  // this prompt (recency + keyword match — no pgvector store exists
  // in this base, see lib/memory.ts). Every query tolerates the
  // tables/column being absent (SQL not applied yet): a failure just
  // means that layer is empty for this turn, never a failed chat.
  let assistantInstructions = "";
  let assistantName = "";
  let assistantMode = parseAssistantMode(null);
  let customInstructions = "";
  let memoryFacts: string[] = [];

  const authed = await getAuthedServerContext(request).catch(() => null);
  if (authed) {
    const assistantId =
      typeof body.assistantId === "string" ? body.assistantId.trim() : "";

    const [assistantRow, profileRow, memoryRows] = await Promise.all([
      assistantId
        ? quietly(
            authed.client
              .from("assistants")
              .select("name, instructions, mode, owner_id, is_public")
              .eq("id", assistantId)
              .maybeSingle()
          )
        : Promise.resolve(null),
      quietly(
        authed.client
          .from("profiles")
          .select("custom_instructions")
          .eq("id", authed.userId)
          .maybeSingle()
      ),
      quietly(
        authed.client
          .from("memories")
          .select("id, fact, source_chat_id, confidence, created_at")
          .eq("user_id", authed.userId)
          .order("created_at", { ascending: false })
          .limit(100)
      ),
    ]);

    const assistantData = assistantRow?.data as {
      name?: unknown;
      instructions?: unknown;
      mode?: unknown;
      owner_id?: unknown;
      is_public?: unknown;
    } | null;
    // A saved assistant loads only for its owner or when public —
    // a private assistant id guessed by someone else stays hidden.
    if (
      assistantData &&
      (assistantData.owner_id === authed.userId ||
        assistantData.is_public === true)
    ) {
      assistantInstructions =
        typeof assistantData.instructions === "string"
          ? assistantData.instructions
          : "";
      assistantName =
        typeof assistantData.name === "string" ? assistantData.name : "";
      assistantMode = parseAssistantMode(assistantData.mode);
    }

    const profileData = profileRow?.data as {
      custom_instructions?: unknown;
    } | null;
    customInstructions =
      typeof profileData?.custom_instructions === "string"
        ? profileData.custom_instructions
        : "";

    const rows = ((memoryRows?.data ?? []) as unknown as {
      id: string;
      fact: string;
      source_chat_id: string | null;
      confidence: number;
      created_at: string;
    }[]).map((row) => ({
      id: row.id,
      fact: row.fact,
      sourceChatId: row.source_chat_id,
      confidence: Number(row.confidence ?? 0.5),
      createdAt: row.created_at,
    })) as MemoryRecord[];
    if (rows.length > 0) {
      memoryFacts = selectRelevantMemories(rows, prompt, 5).map(
        (memory) => memory.fact
      );
    }
  }

  // Guest / starter path: inline assistant instructions sent by the
  // client (capped — an unbounded system prompt is a quota hole).
  // A DB-loaded assistant above always wins over this.
  if (!assistantInstructions) {
    const inline =
      typeof body.assistant === "object" && body.assistant !== null
        ? (body.assistant as Record<string, unknown>)
        : null;
    if (inline) {
      const text =
        typeof inline.instructions === "string" ? inline.instructions : "";
      assistantInstructions = text.slice(
        0,
        MAX_ASSISTANT_INSTRUCTIONS_CHARS
      );
      assistantName =
        typeof inline.name === "string" ? inline.name.slice(0, 80) : "";
      assistantMode = parseAssistantMode(inline.mode);
    }
  }

  // An assistant's preferred mode wins over the mode picker; otherwise
  // the picker's (or legacy model's) mode stands.
  const effectiveModeId = assistantMode ?? modeId ?? "smart";
  const effectiveThinking =
    thinking ?? defaultThinkingForMode(effectiveModeId);
  const effectiveResolved = resolveChatMode(
    effectiveModeId,
    effectiveThinking
  );
  const resolved = effectiveResolved;

  const systemPrompt = buildSystemPrompt({
    customInstructions,
    assistantInstructions,
    assistantName,
    memories: memoryFacts,
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

  // De-dupe: a mode whose primary and fallback are the same model
  // has no fallback to race or fall back to.
  const chain =
    resolved.modelId === resolved.fallbackModelId
      ? [resolved.modelId]
      : [resolved.modelId, resolved.fallbackModelId];
  // Model-health short-circuit: a recently-429'd primary is skipped
  // in favour of the fallback-first order.
  const orderedChain =
    chain.length === 2 &&
    (last429AtByModel.get(chain[0]) ?? 0) >
      Date.now() - MODEL_429_COOLDOWN_MS
      ? [chain[1], chain[0]]
      : chain;

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

      const emitInterrupted = () => {
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
      };

        // System prompt: the artifact fence format first, then the
        // user's custom instructions + selected assistant + relevant
        // memories (empty = no override, the model behaves exactly
        // as before).
        const systemInstruction = [
          ARTIFACT_SYSTEM_INSTRUCTION,
          systemPrompt,
        ]
          .filter(Boolean)
          .join("\n\n");

      const emitFinalError = () => {
        console.error("Gemini chat failed on all models:", lastError);
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
      };

      const closeQuietly = () => {
        try {
          controller.close();
        } catch {
          // Stream may already be closed.
        }
      };

      // First-emit race: resolves the first time any attempt emits.
      let resolveFirstEmit: () => void = () => {};
      const firstEmitPromise = new Promise<void>((resolve) => {
        resolveFirstEmit = resolve;
      });
      let winnerId: string | null = null;
      const claimWin = (modelId: string): boolean => {
        if (winnerId !== null) return winnerId === modelId;
        winnerId = modelId;
        resolveFirstEmit();
        return true;
      };

      type AttemptResult =
        | { kind: "done" }
        | { kind: "failed"; error: unknown }
        | { kind: "aborted" };

      // One model attempt: streams its chunks into the shared
      // controller ONLY while it is the race winner. The first chunk
      // claims the win; the loser returns "aborted" without emitting
      // anything, so the client never sees duplicated output.
      // A grounded attempt that fails before emitting retries the
      // SAME model once without grounding tools before reporting
      // failure — live (2026-11-22) a grounded call fails with 429
      // quota errors while the same model answers fine without
      // tools, deterministically. The retry only happens before any
      // output (a retry after partial output would duplicate the
      // answer).
      const runAttempt = async (
        modelId: string,
        signal: AbortSignal,
        useTools = true
      ): Promise<AttemptResult> => {
        const attemptTools = useTools && tools.length > 0;
        const model = client.getGenerativeModel({
          model: modelId,
          ...(systemInstruction ? { systemInstruction } : {}),
          generationConfig: {
            ...thinkingConfig(
              resolved.thinkingLevel,
              resolved.includeThoughts
            ),
          },
          ...(attemptTools ? { tools } : {}),
        });

        try {
          const result =
            attachments.length > 0
              ? await model.generateContentStream(
                  {
                    contents: [
                      {
                        role: "user",
                        parts: [
                          ...attachmentsToInlineDataParts(attachments),
                          { text: prompt },
                        ],
                      },
                    ],
                  },
                  { signal } as never
                )
              : await model.generateContentStream(prompt, {
                  signal,
                } as never);

          if (signal.aborted || request.signal.aborted || cancelled) {
            return { kind: "aborted" };
          }

          let sources: GroundingSource[] = [];

          for await (const chunk of result.stream) {
            if (signal.aborted || request.signal.aborted || cancelled) {
              return { kind: "aborted" };
            }
            if (!claimWin(modelId)) {
              return { kind: "aborted" };
            }

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

          if (signal.aborted || request.signal.aborted || cancelled) {
            return { kind: "aborted" };
          }

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
          return { kind: "done" };
        } catch (error) {
          if (
            signal.aborted ||
            request.signal.aborted ||
            cancelled ||
            isAbortError(error)
          ) {
            return { kind: "aborted" };
          }

          // Grounding degrade: the grounded attempt failed before
          // emitting — retry the same model without tools. Any
          // pre-emit failure qualifies (400 tool rejection, 429
          // quota, 5xx): the plain call succeeds where the
          // grounded one fails. Only before any output has been
          // emitted.
          if (
            attemptTools &&
            !emittedAnything &&
            shouldDegradeGrounding(error)
          ) {
            console.warn(
              "[ANVIX CHAT] Grounded attempt failed, retrying without tools",
              {
                model: modelId,
                status: classifyGeminiFailure(error).status,
              }
            );
            return runAttempt(modelId, signal, false);
          }

          return { kind: "failed", error };
        }
      };

      const startAttempt = (modelId: string) => {
        const ac = new AbortController();
        // Client disconnect aborts the in-flight attempt (the SDK
        // accepts the signal; without this a disconnect would leave
        // the attempt hanging until the model responds).
        request.signal.addEventListener("abort", () => ac.abort(), {
          once: true,
        });
        if (request.signal.aborted || cancelled) ac.abort();
        return {
          controller: ac,
          promise: runAttempt(modelId, ac.signal),
        };
      };

      // Handle one attempt's outcome. Returns true when the stream
      // is finished (done, aborted, or a terminal failure) and false
      // when the caller should try the next model in the chain.
      const handleResult = (
        modelId: string,
        result: AttemptResult
      ): boolean => {
        if (result.kind === "done") return true;
        if (result.kind === "aborted") {
          closeQuietly();
          return true;
        }

        lastError = result.error;
        console.error("Gemini stream error:", result.error);

        const classification = classifyGeminiFailure(result.error);
        if (classification.status === 429) {
          last429AtByModel.set(modelId, Date.now());
        }

        // Output already started: surface the failure, don't retry
        // (a retry would duplicate the partial answer).
        if (emittedAnything) {
          emitInterrupted();
          return true;
        }

        // Only provider/transient failures are fallback-worthy. A
        // 400 / 401 / 404 / invalid-request fails immediately — no
        // second round-trip for a request that can never succeed.
        // Exception: a 400 with grounding on may be the tools being
        // rejected, not the request — the fallback attempt degrades
        // to no-tools itself, so it still gets a chance.
        const fallbackWorthy =
          (classification.status !== undefined &&
            FALLBACK_WORTHY_STATUSES.has(classification.status)) ||
          classification.category === "timeout" ||
          (webEnabled && classification.status === 400);
        if (!fallbackWorthy) {
          console.warn(
            "[ANVIX CHAT] Model failed with a non-retryable error, not falling back",
            {
              model: modelId,
              status: classification.status,
              category: classification.category,
            }
          );
          emitFinalError();
          return true;
        }

        console.warn(
          "[ANVIX CHAT] Model failed before emitting, trying fallback",
          { model: modelId }
        );
        return false;
      };

      const first = startAttempt(orderedChain[0]);

      // Wait for the first attempt to emit, finish, or hit the 8 s
      // first-token deadline.
      const firstPhase = await Promise.race([
        firstEmitPromise.then(() => "emitted" as const),
        first.promise.then(() => "finished" as const),
        new Promise<"timeout">((resolve) =>
          setTimeout(() => resolve("timeout"), FIRST_TOKEN_DEADLINE_MS)
        ),
      ]);

      if (firstPhase === "timeout" && orderedChain.length === 2) {
        // Primary is slow (not failed — a failure would have ended
        // the race above): start the fallback in parallel and race
        // on the first chunk.
        const second = startAttempt(orderedChain[1]);

        // Wait until someone emits or both finish.
        await Promise.race([
          firstEmitPromise,
          Promise.allSettled([first.promise, second.promise]).then(
            () => undefined
          ),
        ]);

        // Abort the loser (whoever did not win the race).
        if (winnerId !== null) {
          const loser =
            winnerId === orderedChain[0] ? second : first;
          loser.controller.abort();
        }

        const [firstResult, secondResult] = await Promise.all([
          first.promise,
          second.promise,
        ]);

        // Nobody emitted: both failed before emitting and there is
        // nothing left to try.
        if (winnerId === null) {
          const failed =
            firstResult.kind === "failed"
              ? firstResult
              : secondResult.kind === "failed"
                ? secondResult
                : null;
          if (failed) lastError = failed.error;
          emitFinalError();
          return;
        }

        const winnerResult =
          winnerId === orderedChain[0] ? firstResult : secondResult;
        if (winnerResult.kind === "done") return;
        if (winnerResult.kind === "aborted") {
          closeQuietly();
          return;
        }
        // The winner failed after emitting (it emitted, so it is the
        // winner): surface it. No further fallback — the other model
        // already ran in parallel.
        lastError = winnerResult.error;
        console.error("Gemini stream error:", winnerResult.error);
        if (emittedAnything) {
          emitInterrupted();
        } else {
          emitFinalError();
        }
        return;
      }

      // First attempt emitted or finished before the deadline.
      const firstResult = await first.promise;
      if (handleResult(orderedChain[0], firstResult)) return;

      // Fallback-worthy failure before any emit: try the second
      // model serially (it has not run yet).
      if (orderedChain.length === 2) {
        const second = startAttempt(orderedChain[1]);
        const secondResult = await second.promise;
        if (handleResult(orderedChain[1], secondResult)) return;
      }

      // Every model failed before emitting anything (or aborted).
      if (cancelled || request.signal.aborted) {
        closeQuietly();
        return;
      }
      emitFinalError();
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

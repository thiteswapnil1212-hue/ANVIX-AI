import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveCallerApiKey } from "@/lib/byok/key-resolution";
import { recordUsage } from "@/lib/usage/meter";
import { flushUsageInBackground } from "@/lib/usage/server-flush";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { classifyGeminiFailure } from "@/lib/gemini/fallback";
import {
  parseChatMode,
  parseThinkingChoice,
  resolveChatMode,
  resolveLegacyChatModel,
  defaultThinkingForMode,
  thinkingLevelForModel,
  type ChatModeId,
  type ThinkingChoice,
} from "@/lib/chat-modes";
import { splitChunkParts } from "@/lib/gemini/chat-stream";
import {
  extractGroundingSources,
  groundingTools,
  isGroundingCoolingDown,
  mergeGroundingSources,
  recordGroundingQuotaFailure,
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
import { deepReasoningInstructionForMode } from "@/lib/chat/deep-reasoning";
import { buildLoopContext } from "@/lib/chat/agentic-loop";
import { runAgenticLoop } from "@/lib/chat/agentic-loop-runner";
import {
  CHAT_MODEL_ID,
  thinkingConfig,
} from "@/lib/gemini/model-config";
import {
  codeExecutionTool,
  extractCodeExecution,
} from "@/lib/gemini/code-execution";
import {
  GROQ_FIRST_TOKEN_DEADLINE_MS,
  isGroqConfigured,
  shouldTryGroqDeep,
} from "@/lib/groq/config";
import { streamGroqChatCompletion } from "@/lib/groq/client";

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

  // Verify the caller ONCE: getAuthedServerContext is this route's
  // identity check (assistants / profile / memories below all use
  // it), and key resolution reuses its verdict instead of paying a
  // second getUser round-trip for the same token. Both checks are the
  // same call — client.auth.getUser(token), 2 s timeout, fail-open
  // null — so reusing the verdict changes no auth decision. Guests
  // (no token) skip verification entirely in both places; the rate
  // limiter above already does the same. A signed-in request used to
  // pay getUser three times on a cold instance (rate limit + key
  // resolution + this context); the rate limit's 60 s cache covers
  // warm instances, and this dedupe removes one of the two uncached
  // calls. The remaining pre-Gemini work for a guest is all in-memory
  // (rate-limit map, usage staging) — the cold path's real cost is
  // the function bootstrap + Gemini's time to first token, neither of
  // which this route can cut.
  const authed = await getAuthedServerContext(request).catch(() => null);

  // BYOK: the caller's own key when they asked for it and one is stored,
  // else the shared server key. The client only ever sends the boolean
  // flag — the key itself never leaves this route.
  const resolvedKey = await resolveCallerApiKey(request, {
    useOwnKey: body.useOwnKey === true,
    sharedKey: process.env.GEMINI_API_KEY,
    verifiedUserId: authed?.userId ?? null,
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
      // Grounding sources gathered by the agentic loop (Deep only);
      // merged into the final `sources` event so the "Grounded" badge
      // renders for loop research too. Empty unless the loop ran.
      let loopSources: GroundingSource[] = [];

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

      // Loop narration (plan / step / verify) for the Thinking block.
      // Unlike emitThinking this does NOT set emittedAnything: loop
      // narration is pre-answer planning, not model output, and the
      // plain chain's fallback/degrade logic keys off
      // emittedAnything — a loop that narrated and then fell back
      // must still get its normal fallback instead of an
      // "interrupted" error.
      const emitLoopThinking = (text: string) => {
        if (!text || !eventsEnabled) return;
        try {
          controller.enqueue(
            encoder.encode(encodeChatEvent({ t: "thinking", text }))
          );
        } catch {
          // Client may have disconnected.
        }
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
        // Deep-mode reasoning instruction (Deep only — Fast/Smart get
        // "" here, so their prompts are byte-identical to before),
        // then the user's custom instructions + selected assistant +
        // relevant memories (empty = no override, the model behaves
        // exactly as before). `let`, not `const`: a successful
        // agentic loop appends its verified brief below, before the
        // final answer call.
        let systemInstruction = [
          ARTIFACT_SYSTEM_INSTRUCTION,
          deepReasoningInstructionForMode(resolved.mode.id),
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
        // The thinking level is re-resolved per attempt model: the
        // stored resolved level is the primary's, and a fallback to
        // the other model must never inherit a level it rejects
        // (Off is `minimal` on Lite only; `low` on 3.8-flash).
        const attemptThinking = thinkingLevelForModel(
          resolved.thinking,
          modelId
        );
        const model = client.getGenerativeModel({
          model: modelId,
          ...(systemInstruction ? { systemInstruction } : {}),
          generationConfig: {
            ...thinkingConfig(
              attemptThinking.level,
              attemptThinking.includeThoughts
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
            // Loop research sources first (they were gathered before
            // this attempt); the attempt's own sources merge after.
            const allSources = mergeGroundingSources(
              loopSources,
              sources
            );
            if (allSources.length > 0) {
              controller.enqueue(
                encoder.encode(
                  encodeChatEvent({ t: "sources", sources: allSources })
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
            const status = classifyGeminiFailure(error).status;
            console.warn(
              "[ANVIX CHAT] Grounded attempt failed, retrying without tools",
              {
                model: modelId,
                status,
              }
            );
            // A grounded 429 means the grounding quota is exhausted:
            // arm the cooldown so the next few minutes of Web-ON
            // requests skip the doomed grounded attempt entirely and
            // go straight to plain. A plain attempt's 429 is a
            // model-quota failure, not a grounding one — it never
            // reaches this branch (attemptTools is false), so it is
            // handled by the model-health cooldown instead.
            if (status === 429) recordGroundingQuotaFailure();
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
        // Grounding-quota cooldown: when a recent grounded attempt
        // 429'd, start without tools — the plain attempt is what
        // answers, so attaching tools would only pay for a failure.
        // The degrade path inside runAttempt still covers a first
        // 429 (it arms the cooldown); this gate covers the requests
        // after it. Sources can only arrive when tools were attached,
        // so the "Grounded" badge stays honest by construction.
        return {
          controller: ac,
          promise: runAttempt(
            modelId,
            ac.signal,
            !isGroundingCoolingDown()
          ),
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
        // Exceptions: a 400 with grounding on may be the tools being
        // rejected, not the request — the fallback attempt degrades
        // to no-tools itself, so it still gets a chance. And a
        // model-availability failure (404 / "model not found" /
        // "unsupported model") means THIS model cannot serve the
        // request, not that the request is bad — the next model in
        // the chain gets a chance. (2026-11-27: Deep died outright
        // on gemini-4-hydrogen because this class was not
        // fallback-worthy.)
        const fallbackWorthy =
          (classification.status !== undefined &&
            FALLBACK_WORTHY_STATUSES.has(classification.status)) ||
          classification.category === "timeout" ||
          classification.category === "model_unavailable" ||
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

      // Groq R1-distill pre-phase (Deep mode only, key configured, no
      // attachments — the distill is text-only). Groq reasons first;
      // ANY pre-emit Groq failure falls through to the Gemini chain
      // below, so the user never sees a Groq error outright. Returns
      // true when the stream is finished (done, aborted, or a
      // terminal failure after output) and false when the caller
      // should run the Gemini chain.
      //
      // Web-ON: Groq runs WITHOUT grounding tools (it has none) — a
      // grounded Gemini answer only happens if Groq fails and the
      // Gemini leg runs grounded. The thinking toggle does not change
      // Groq's reasoning (reasoning models take no effort
      // parameter) — it still controls the Gemini fallback path and
      // the Deep reasoning prompt.
      //
      // Provenance: Groq's think deltas are BUFFERED until the first
      // answer text arrives. If Groq fails before any text, the
      // buffered reasoning is dropped and the Gemini path stays
      // clean (emittedAnything stays false, so its grounding-degrade
      // still works) — the client never sees reasoning for an answer
      // it did not get.
      const runGroqPhase = async (): Promise<boolean> => {
        const ac = new AbortController();
        request.signal.addEventListener("abort", () => ac.abort(), {
          once: true,
        });
        if (request.signal.aborted || cancelled) ac.abort();

        let groqEmitted = false;
        let groqDone = false;
        let groqError: unknown = null;
        let bufferedThinking = "";

        const groqPromise = streamGroqChatCompletion({
          apiKey: process.env.GROQ_API_KEY as string,
          systemInstruction,
          prompt,
          signal: ac.signal,
          onThinking: (text) => {
            bufferedThinking += text;
          },
          onText: (text) => {
            // Commit point: flush the buffered reasoning first, so
            // the Thinking block precedes the answer it produced.
            if (bufferedThinking) {
              emitThinking(bufferedThinking);
              bufferedThinking = "";
            }
            groqEmitted = true;
            emitText(text);
          },
        }).then(
          () => {
            groqDone = true;
          },
          (error) => {
            groqError = error;
          }
        );

        // First-token deadline: Groq is fast (sub-second TTFT
        // normally); a hung Groq leg must not stall the Gemini
        // fallback. The deadline only bites when nothing has been
        // emitted yet — a streaming Groq answer runs to completion.
        const settled = await Promise.race([
          groqPromise.then(() => true),
          new Promise<boolean>((resolve) =>
            setTimeout(
              () => resolve(false),
              GROQ_FIRST_TOKEN_DEADLINE_MS
            )
          ),
        ]);
        if (!settled && !groqEmitted) {
          ac.abort();
          await groqPromise;
          console.warn(
            "[ANVIX CHAT] Groq Deep attempt timed out before first token, falling back to Gemini",
            { model: "groq-r1-distill" }
          );
          return false;
        }

        await groqPromise;

        if (cancelled || request.signal.aborted) {
          closeQuietly();
          return true;
        }

        if (groqDone && groqEmitted) {
          if (eventsEnabled) {
            controller.enqueue(
              encoder.encode(encodeChatEvent({ t: "done" }))
            );
          }
          controller.close();
          return true;
        }

        // Clean finish with no answer text: treat as a failure and
        // let Gemini answer (the buffered reasoning is dropped).
        if (groqDone) {
          console.warn(
            "[ANVIX CHAT] Groq Deep attempt finished with no answer text, falling back to Gemini",
            { model: "groq-r1-distill" }
          );
          return false;
        }

        console.warn(
          "[ANVIX CHAT] Groq Deep attempt failed, falling back to Gemini",
          { error: groqError }
        );
        if (groqEmitted) {
          emitInterrupted();
          return true;
        }
        return false;
      };

      if (
        shouldTryGroqDeep({
          modeId: resolved.mode.id,
          hasGroqKey: isGroqConfigured(process.env.GROQ_API_KEY),
          hasAttachments: attachments.length > 0,
        })
      ) {
        if (await runGroqPhase()) return;
      }

      // Agentic loop (Deep mode, Gemini path only — the Groq phase
      // above already answered when it could, and Groq stays
      // one-shot). PLAN → ACT (grounded search / Python execution,
      // max 5 steps) → VERIFY → final streamed answer. Any loop
      // failure returns "fallback" and the plain Deep chain below
      // answers exactly as before — the loop never costs the user
      // their answer. Skipped with attachments: the loop's calls are
      // text-only and cannot see them, so the brief could mislead the
      // final answer about an image/PDF question.
      //
      // Internal calls run on Flash-Lite + `low` thinking with
      // capped outputs (the loop is scaffolding; the Deep model
      // delivers the answer). Loop narration goes through
      // emitLoopThinking, which never sets emittedAnything, so a
      // loop that narrated and then fell back still gets the plain
      // chain's normal fallback instead of an "interrupted" error.
      if (
        resolved.mode.id === "deep" &&
        attachments.length === 0 &&
        !cancelled &&
        !request.signal.aborted
      ) {
        const loopResult = await runAgenticLoop({
          prompt,
          webAvailable: webEnabled && !isGroundingCoolingDown(),
          generate: async ({ prompt: loopPrompt, tools, signal }) => {
            const loopModel = client.getGenerativeModel({
              model: CHAT_MODEL_ID,
              generationConfig: {
                ...thinkingConfig("low", false),
                maxOutputTokens: 2048,
              },
              ...(tools === "grounding"
                ? { tools: groundingTools(true) }
                : {}),
              ...(tools === "code" ? { tools: codeExecutionTool() } : {}),
            });
            const result = await loopModel.generateContent(loopPrompt, {
              signal,
            } as never);
            const response = result.response;
            // Raw-part split, never response.text(): thought parts
            // must not leak into loop findings.
            const { text } = splitChunkParts(response);
            return {
              text,
              sources:
                tools === "grounding"
                  ? extractGroundingSources(response)
                  : [],
              ...(tools === "code"
                ? { code: extractCodeExecution(response) }
                : {}),
            };
          },
          signal: request.signal,
          onThinking: emitLoopThinking,
        });

        if (loopResult.outcome === "done") {
          systemInstruction = [
            systemInstruction,
            buildLoopContext(loopResult.brief),
          ]
            .filter(Boolean)
            .join("\n\n");
          loopSources = loopResult.sources;
          console.info("[ANVIX CHAT] Agentic loop completed", {
            steps: loopResult.stepsUsed,
            sources: loopResult.sources.length,
          });
        } else if (loopResult.outcome === "fallback") {
          console.warn(
            "[ANVIX CHAT] Agentic loop fell back to plain Deep",
            { reason: loopResult.reason }
          );
        }
        // "direct" → nothing to add; the plain chain answers as before.

        if (cancelled || request.signal.aborted) {
          closeQuietly();
          return;
        }
      }

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

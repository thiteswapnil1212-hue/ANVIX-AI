/**
 * Groq provider for Deep-mode reasoning.
 *
 * Provider choice (verified by the parent by web search, 2026-11-27):
 * Groq is free with no card, exposes an OpenAI-compatible API at
 * https://api.groq.com/openai/v1, and the key comes from
 * console.groq.com as the server env var `GROQ_API_KEY`. OpenRouter
 * was rejected as the primary: its free R1 (`deepseek/deepseek-r1:free`)
 * is 50 requests/day shared, which a shared key would burn in a day.
 *
 * DEAD MODEL, 2026-11-28 — read this before changing the chain:
 * the original model, `deepseek-r1-distill-llama-70b`, was
 * DECOMMISSIONED. Vercel runtime logs showed Groq returning HTTP 400
 * `model_decommissioned` ("The model has been decommissioned and is
 * no longer supported"), and Groq's own deprecations page
 * (console.groq.com/docs/deprecations, crawled 2026-11-28) confirms
 * it was deprecated 2025-09-02 and shut down 2025-10-02 — dead for
 * almost two months before the R1 lane was built. The id came from
 * community search results, which listed it as live. LESSON: model
 * ids must be checked against the provider's OWN deprecations page,
 * never community lists. The same page kills the other candidates
 * from those lists too: `llama-3.3-70b-versatile` (shutdown
 * 2026-08-16), `qwen/qwen3-32b` (2026-07-17), `qwen-qwq-32b`
 * (2025-07-14), `deepseek-r1-distill-qwen-32b` (2025-04-14) — all
 * recorded in GROQ_DECOMMISSIONED_MODEL_IDS below, and a test pins
 * that none of them is in the chain.
 *
 * CURRENT CHAIN (verified against Groq's own reasoning docs,
 * console.groq.com/docs/reasoning, crawled 2026-11-28, and its
 * deprecations page): primary `openai/gpt-oss-120b` — Groq's own
 * repeatedly recommended replacement for reasoning workloads — and
 * secondary `qwen/qwen3.8-27b`, the successor of qwen3.6-27b with
 * thinking modes. Both accept `reasoning_effort` low/medium/high
 * (Groq docs), so the thinking toggle now maps onto the Groq leg
 * instead of being ignored. The leg tries the primary, then the
 * secondary on ANY pre-emit failure (including a future 400
 * `model_decommissioned`), then the Gemini chain — so one future
 * decommission can never silently kill the leg again.
 *
 * The Groq leg is Deep-mode only and opt-in by key: without
 * `GROQ_API_KEY` Deep behaves exactly as before (Gemini 3.8 Flash +
 * reasoning prompt). Every Groq failure falls back to the Gemini
 * chain — the Groq leg never errors the user outright.
 */

import type { ThinkingChoice } from "../chat-modes.ts";

/** OpenAI-compatible chat-completions base URL. */
export const GROQ_API_URL = "https://api.groq.com/openai/v1";

/**
 * The Deep-mode Groq chain, in try order. No other file may hard-code
 * a Groq model string; everything reads this constant.
 */
export const GROQ_DEEP_MODEL_CHAIN = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
] as const;

export type GroqDeepModelId = (typeof GROQ_DEEP_MODEL_CHAIN)[number];

/**
 * Model ids Groq has shut down (from Groq's own deprecations page).
 * A test pins that none of these appears in GROQ_DEEP_MODEL_CHAIN.
 * Keep this list growing when Groq retires a model — it is the
 * tripwire that stops a dead id from being re-added from a stale
 * community list.
 */
export const GROQ_DECOMMISSIONED_MODEL_IDS = [
  "deepseek-r1-distill-llama-70b",
  "llama-3.3-70b-versatile",
  "qwen/qwen3-32b",
  "qwen-qwq-32b",
  "deepseek-r1-distill-qwen-32b",
] as const;

/** Server env var holding the Groq key (never public, never logged). */
export const GROQ_API_KEY_ENV_VAR = "GROQ_API_KEY";

/**
 * Overall stream timeout for one Groq call. Groq is fast (sub-second
 * time to first token normally); the chat route also enforces its own
 * 8 s first-token deadline per attempt before trying the next model,
 * so this is only a backstop against a hung stream inside maxDuration
 * (120 s).
 */
export const GROQ_STREAM_TIMEOUT_MS = 110_000;

/**
 * Completion-token budget for one Groq Deep call.
 *
 * Live defect (loop-verify-groq-fix, 2026-11-28): Groq's reasoning
 * docs (console.groq.com/docs/reasoning, crawled 2026-11-28) put the
 * default `max_completion_tokens` at 1024 and warn it "may be too low
 * for complex reasoning" and that "complex proofs may require higher
 * limits" — reasoning tokens count against the same budget ("reasoning
 * chains that are part of the token output"). The client used to send
 * no budget, so a hard question with reasoning_effort "high" burned
 * the whole 1024 tokens on reasoning and the stream ended
 * (finish_reason "length") with no answer text: live 2026-11-28,
 * both chain models "finished with no answer text" on
 * 987654321 x 123456789, while easy questions answered in 1–2 s.
 * The route's 8 s first-token deadline is NOT the culprit — the
 * logs show the no-text branch, not the timeout branch, and 1024
 * tokens stream in ~2 s at Groq speed.
 *
 * 16,384 is the lower of the two chain models' maxima on Groq's
 * models page (GPT-OSS 120B: 65,536; Qwen 3.8 27B: 16,384), 16x the
 * default — one shared value valid for both models. If a question
 * still starves at 16k, the per-model maxima are the next step, not
 * a guess. Truncation still degrades safely: no answer text means
 * the route tries the next chain model, then Gemini.
 */
export const GROQ_MAX_COMPLETION_TOKENS = 16_384;

/**
 * First-token deadline for one Groq attempt inside `/api/chat`: if
 * the model has not emitted anything within this window, the route
 * aborts it and tries the next model in the chain (or the Gemini
 * chain) instead of stalling the user.
 */
export const GROQ_FIRST_TOKEN_DEADLINE_MS = 8_000;

/**
 * Maps the thinking toggle onto Groq's `reasoning_effort` parameter.
 * Verified against Groq's own reasoning docs (console.groq.com/docs/
 * reasoning, crawled 2026-11-28): `low` / `medium` / `high` are
 * supported by GPT-OSS 120B and Qwen 3.8 27B alike, so one mapping
 * serves the whole chain. Off is `low`, not `none`: `none` disables
 * reasoning entirely (and is only supported by Qwen), while Deep mode
 * must always reason — Off just reasons lightly.
 */
export function groqReasoningEffortForThinking(
  choice: ThinkingChoice
): "low" | "medium" | "high" {
  if (choice === "deep") return "high";
  if (choice === "fast") return "medium";
  return "low";
}

/** True when a Groq key is configured (non-empty after trimming). */
export function isGroqConfigured(apiKey: unknown): boolean {
  return typeof apiKey === "string" && apiKey.trim().length > 0;
}

export type GroqDeepEligibility = {
  modeId: unknown;
  hasGroqKey: boolean;
  hasAttachments: boolean;
};

/**
 * Whether Deep mode should try Groq first. All three must hold:
 * mode is Deep, a Groq key is configured, and the request carries no
 * attachments — both chain models are text-only, so an image/PDF
 * message stays on the Gemini path, which handles inline data parts.
 * Fast/Smart never try Groq.
 */
export function shouldTryGroqDeep({
  modeId,
  hasGroqKey,
  hasAttachments,
}: GroqDeepEligibility): boolean {
  return modeId === "deep" && hasGroqKey && !hasAttachments;
}

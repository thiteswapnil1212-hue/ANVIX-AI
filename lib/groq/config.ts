/**
 * Groq provider for Deep-mode reasoning (groq-r1-deep lane, 2026-11-27).
 *
 * Provider choice (verified by the parent by web search, 2026-11-27):
 * Groq is free with no card, exposes an OpenAI-compatible API at
 * https://api.groq.com/openai/v1, and the key comes from
 * console.groq.com as the server env var `GROQ_API_KEY`. OpenRouter
 * was rejected as the primary: its free R1 (`deepseek/deepseek-r1:free`)
 * is 50 requests/day shared, which a shared key would burn in a day.
 *
 * HONEST SCOPE — read this before calling anything "R1": Groq hosts
 * `deepseek-r1-distill-llama-70b`, the 70B DISTILL of DeepSeek R1, not
 * the full 671B R1. It is a reasoning model (it emits a `<think>` trace
 * before its answer), and on the free tier it allows roughly 1,000
 * requests/day — but it is not the full R1. No user-visible copy
 * anywhere in this repo calls it full R1 or "ChatGPT".
 *
 * The Groq leg is Deep-mode only and opt-in by key: without
 * `GROQ_API_KEY` Deep behaves exactly as before (Gemini 3.8 Flash +
 * reasoning prompt). Every Groq failure falls back to the Gemini
 * chain — the Groq leg never errors the user outright.
 */

/** OpenAI-compatible chat-completions base URL. */
export const GROQ_API_URL = "https://api.groq.com/openai/v1";

/**
 * The reasoning model for Deep mode: DeepSeek R1 DISTILLED into
 * Llama 3.3 70B. See the module header — this is the 70B distill,
 * not the full 671B R1. No other file may hard-code a Groq model
 * string; everything reads this constant.
 */
export const GROQ_REASONING_MODEL_ID =
  "deepseek-r1-distill-llama-70b";

/** Server env var holding the Groq key (never public, never logged). */
export const GROQ_API_KEY_ENV_VAR = "GROQ_API_KEY";

/**
 * Overall stream timeout for one Groq call. Groq is fast (sub-second
 * time to first token normally); the chat route also enforces its own
 * 8 s first-token deadline before falling back to Gemini, so this is
 * only a backstop against a hung stream inside maxDuration (120 s).
 */
export const GROQ_STREAM_TIMEOUT_MS = 110_000;

/**
 * First-token deadline for the Groq leg inside `/api/chat`: if Groq
 * has not emitted anything within this window, the route aborts it
 * and runs the Gemini chain instead of stalling the user.
 */
export const GROQ_FIRST_TOKEN_DEADLINE_MS = 8_000;

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
 * attachments — the R1 distill is text-only, so an image/PDF message
 * stays on the Gemini path, which handles inline data parts.
 * Fast/Smart never try Groq.
 */
export function shouldTryGroqDeep({
  modeId,
  hasGroqKey,
  hasAttachments,
}: GroqDeepEligibility): boolean {
  return modeId === "deep" && hasGroqKey && !hasAttachments;
}

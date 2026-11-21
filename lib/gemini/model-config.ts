import type { GenerationConfig } from "@google/generative-ai";

/**
 * Central Gemini model configuration.
 *
 * Wave 1 migration (2026-11-21): `gemini-2.5-flash` is deprecated and shuts
 * down 1 Dec 2026 (requests auto-route to `gemini-3.5-flash-lite` with
 * breaking changes). Every model id in the app comes from here — no other
 * file may hard-code a model string. See
 * `~/workspace/scratch/anvix-next-level/wave1/SDK_DECISION.md` for why the
 * app stays on the legacy `@google/generative-ai` SDK for this wave.
 *
 * Chain (both free tier): primary `gemini-3.5-flash-lite`, fallback
 * `gemini-3.8-flash`. Chat offers the primary only; build/agent/stream
 * chains try the primary, then the fallback.
 */

// Quick chat / generate — the single model users can pick.
export const CHAT_MODEL_ID = "gemini-3.5-flash-lite";

// Build / agent / stream chains — primary first, fallback second.
export const BUILD_MODEL_CHAIN = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
] as const;
export const AGENT_MODEL_CHAIN = BUILD_MODEL_CHAIN;
export const STREAM_MODEL_CHAIN = BUILD_MODEL_CHAIN;

// One-shot auto-fix pass after a build — cheap model, one pass.
export const FIX_MODEL_ID = "gemini-3.5-flash-lite";

/**
 * Thinking levels for Gemini 3 models (`thinking_level` replaces the
 * 2.5-era `thinkingBudget`; defaults: 3.5 Flash-Lite `minimal`,
 * 3.8 Flash `medium`).
 *
 * - Quick chat: `low` — fast and cheap; thinking tokens bill as output.
 * - Build / agent / auto-fix: `medium` — Google's guidance is
 *   `medium`/`high` for autonomous subagents with tool calls, code
 *   execution, or multi-step reasoning.
 */
export type ThinkingLevel = "minimal" | "low" | "medium" | "high" | "xhigh";

export const CHAT_THINKING_LEVEL: ThinkingLevel = "low";
export const BUILD_THINKING_LEVEL: ThinkingLevel = "medium";
export const AGENT_THINKING_LEVEL: ThinkingLevel = "medium";
export const FIX_THINKING_LEVEL: ThinkingLevel = "medium";

/**
 * `thinkingConfig` shim for the legacy SDK.
 *
 * The installed `@google/generative-ai` 0.24.1 has no `thinkingConfig` in
 * its `GenerationConfig` type, but it passes `generationConfig` through
 * verbatim into the v1beta REST request body (verified in the installed
 * `dist/index.mjs`: `Object.assign`, no allow-list), so this field reaches
 * the API. The cast exists only because the SDK types predate Gemini 3 —
 * the value itself is a real, current API field. If a future live deploy
 * ever 400s on AI routes, this field is the first suspect: remove it and
 * the model-string migration stands on its own.
 */
export function thinkingConfig(level: ThinkingLevel): GenerationConfig {
  return {
    thinkingConfig: { thinkingLevel: level },
  } as unknown as GenerationConfig;
}

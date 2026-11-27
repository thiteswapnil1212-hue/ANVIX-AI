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

// Deep mode — the strongest model PROVEN to answer on the live API
// through this app's stack (legacy `@google/generative-ai` SDK,
// GenerateContent path, shared free-tier key). That is
// `gemini-3.8-flash` — the same model as Smart's primary — so Deep
// differs from Smart by reasoning effort, not by model: high
// thinking + the structured reasoning prompt (`lib/chat/deep-reasoning.ts`)
// + the in-generation verify step.
//
// `gemini-4-hydrogen` was the Deep primary until 2026-11-27 and is
// REMOVED, not renamed: it is a real GA model id with a free tier
// (Google pricing page, Nov 2026), but live it fails deterministically
// on this stack for every thinking choice (Deep 0/3 in the
// reasoning baseline; Fast/Smart answer fine), and the fallback never
// rescued it. Two documented reasons it cannot be served here:
// (a) Google routes Hydrogen through the new Interactions API /
// `@google/genai` SDK and calls GenerateContent legacy for Gemini 4;
// third-party native-API docs note Hydrogen "has not been tested on
// Gemini native yet". (b) Hydrogen's supported thinking levels are
// low/medium/high/xhigh — `minimal` (Deep thinking=off) is not one.
// Revisit Hydrogen only when the app migrates to `@google/genai` —
// and live-test it before it becomes any mode's primary again.
export const DEEP_MODEL_ID = "gemini-3.8-flash";

// Build / agent / stream chains — primary first, fallback second.
export const BUILD_MODEL_CHAIN = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
] as const;
export const AGENT_MODEL_CHAIN = BUILD_MODEL_CHAIN;
export const STREAM_MODEL_CHAIN = BUILD_MODEL_CHAIN;

// Chat mode chains (Wave 2 routing) — primary first, fallback second.
export const FAST_MODEL_CHAIN = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
] as const;
export const SMART_MODEL_CHAIN = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
] as const;
export const DEEP_MODEL_CHAIN = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
] as const;

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
 *
 * `includeThoughts` (Wave 2) asks the API to return thought summaries as
 * parts with `thought: true` alongside the answer. Only request them when
 * the UI will actually show them — thought tokens bill as output tokens,
 * so asking for summaries nobody sees burns quota for nothing. Pass
 * `false` (the default) for the "Off" thinking choice.
 */
export function thinkingConfig(
  level: ThinkingLevel,
  includeThoughts = false
): GenerationConfig {
  return {
    thinkingConfig: { thinkingLevel: level, includeThoughts },
  } as unknown as GenerationConfig;
}

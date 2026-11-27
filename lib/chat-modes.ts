import {
  DEEP_MODEL_CHAIN,
  FAST_MODEL_CHAIN,
  SMART_MODEL_CHAIN,
  CHAT_MODEL_ID,
  type ThinkingLevel,
} from "./gemini/model-config.ts";

/**
 * Chat modes + thinking choices (Wave 2: reasoning toggle + model routing).
 *
 * The UI shows named modes — Fast / Smart / Deep — never raw model ids.
 * Each mode picks a model (+ a fallback if the primary fails) and a
 * default thinking effort. The thinking toggle overrides the mode's
 * default; changing mode resets thinking to that mode's default.
 *
 * Thinking choices map to Gemini 3 `thinking_level`s. Gemini 3 has no
 * true "off": Off maps to `minimal` (the lowest level) with
 * `includeThoughts: false`, so no thought tokens are spent on summaries
 * the user hid. Thinking tokens bill as output tokens, so Deep (high)
 * burns quota ~2–5x faster than Fast — the UI says so on the toggle.
 *
 * `minimal` is valid ONLY on `gemini-3.5-flash-lite` — `gemini-3.8-flash`
 * rejects it (live 2026-11-27: Smart/Deep + Off errored while Fast + Off
 * answered). So the Off mapping is model-aware: off on any model other
 * than Lite sends `low` with `includeThoughts: false` instead. The
 * per-attempt model in the chat route re-resolves the level the same
 * way, so a fallback to the other model never inherits a level it
 * rejects.
 */

export type ChatModeId = "fast" | "smart" | "deep";

export type ThinkingChoice = "off" | "fast" | "deep";

export type ChatMode = {
  id: ChatModeId;
  name: string;
  blurb: string;
  modelId: string;
  fallbackModelId: string;
  defaultThinking: ThinkingChoice;
};

export const CHAT_MODES: ChatMode[] = [
  {
    id: "fast",
    name: "Fast",
    blurb: "Quick answers, lowest quota use.",
    modelId: FAST_MODEL_CHAIN[0],
    fallbackModelId: FAST_MODEL_CHAIN[1],
    defaultThinking: "off",
  },
  {
    id: "smart",
    name: "Smart",
    blurb: "Balanced — everyday chat and building.",
    modelId: SMART_MODEL_CHAIN[0],
    fallbackModelId: SMART_MODEL_CHAIN[1],
    defaultThinking: "fast",
  },
  {
    id: "deep",
    name: "Deep",
    blurb: "Hardest reasoning — uses the most quota.",
    modelId: DEEP_MODEL_CHAIN[0],
    fallbackModelId: DEEP_MODEL_CHAIN[1],
    defaultThinking: "deep",
  },
];

export const DEFAULT_CHAT_MODE_ID: ChatModeId = "smart";

export function getChatMode(modeId: string): ChatMode | undefined {
  return CHAT_MODES.find((mode) => mode.id === modeId);
}

/** Unknown / missing mode values fall back to Smart — never throw. */
export function parseChatMode(value: unknown): ChatModeId {
  if (typeof value === "string") {
    const mode = getChatMode(value);
    if (mode) return mode.id;
  }
  return DEFAULT_CHAT_MODE_ID;
}

export function isThinkingChoice(value: unknown): value is ThinkingChoice {
  return value === "off" || value === "fast" || value === "deep";
}

/** Returns undefined when the value is absent or invalid, so callers can
 * fall back to the mode's default thinking. */
export function parseThinkingChoice(value: unknown): ThinkingChoice | undefined {
  return isThinkingChoice(value) ? value : undefined;
}

export function thinkingLevelForChoice(choice: ThinkingChoice): {
  level: ThinkingLevel;
  includeThoughts: boolean;
} {
  // The choice-only mapping is the Lite mapping: Lite is the default
  // chat model and the only one that accepts `minimal`.
  return thinkingLevelForModel(choice, CHAT_MODEL_ID);
}

/**
 * Model-aware thinking level for a choice. Identical to
 * `thinkingLevelForChoice` except Off: `minimal` is valid only on
 * `gemini-3.5-flash-lite`, so off on any other model sends `low` with
 * no thought summaries instead — the lowest level that model accepts.
 * Fast/deep are the same on every model (`low`/`high`).
 */
export function thinkingLevelForModel(
  choice: ThinkingChoice,
  modelId: string
): { level: ThinkingLevel; includeThoughts: boolean } {
  switch (choice) {
    case "off":
      return modelId === CHAT_MODEL_ID
        ? { level: "minimal", includeThoughts: false }
        : { level: "low", includeThoughts: false };
    case "fast":
      return { level: "low", includeThoughts: true };
    case "deep":
      return { level: "high", includeThoughts: true };
  }
}

export function defaultThinkingForMode(modeId: ChatModeId): ThinkingChoice {
  return getChatMode(modeId)?.defaultThinking ?? "fast";
}

export type ResolvedChatMode = {
  mode: ChatMode;
  modelId: string;
  fallbackModelId: string;
  thinking: ThinkingChoice;
  thinkingLevel: ThinkingLevel;
  includeThoughts: boolean;
};

/**
 * Resolve a chat request's mode + thinking choice into the concrete model
 * and thinking config. An absent/invalid thinking choice uses the mode's
 * default; an absent/invalid mode uses Smart. The thinking level is
 * resolved against the mode's PRIMARY model — a fallback attempt
 * re-resolves it per model in the chat route, so the stored level here
 * is the primary's, not a promise about the fallback.
 */
export function resolveChatMode(
  modeId: unknown,
  thinking: unknown
): ResolvedChatMode {
  const mode = getChatMode(parseChatMode(modeId)) ?? CHAT_MODES[1];
  const choice = parseThinkingChoice(thinking) ?? mode.defaultThinking;
  const { level, includeThoughts } = thinkingLevelForModel(
    choice,
    mode.modelId
  );

  return {
    mode,
    modelId: mode.modelId,
    fallbackModelId: mode.fallbackModelId,
    thinking: choice,
    thinkingLevel: level,
    includeThoughts,
  };
}

/**
 * Legacy clients sent a raw model id (`model: "gemini-3.5-flash-lite"`).
 * Translate it to the equivalent mode + thinking so old requests keep
 * behaving exactly as before (lite model, low thinking). Returns null for
 * anything that was never a valid chat model.
 */
export function resolveLegacyChatModel(modelId: unknown): {
  modeId: ChatModeId;
  thinking: ThinkingChoice;
} | null {
  if (modelId === CHAT_MODEL_ID) {
    return { modeId: "fast", thinking: "fast" };
  }
  return null;
}

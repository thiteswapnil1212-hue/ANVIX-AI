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
  switch (choice) {
    case "off":
      return { level: "minimal", includeThoughts: false };
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
 * default; an absent/invalid mode uses Smart.
 */
export function resolveChatMode(
  modeId: unknown,
  thinking: unknown
): ResolvedChatMode {
  const mode = getChatMode(parseChatMode(modeId)) ?? CHAT_MODES[1];
  const choice = parseThinkingChoice(thinking) ?? mode.defaultThinking;
  const { level, includeThoughts } = thinkingLevelForChoice(choice);

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

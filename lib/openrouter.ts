/**
 * OpenRouter multi-model compare — BYOK ONLY, demo lane.
 *
 * The user brings their OWN OpenRouter key; ANVIX holds no shared
 * OpenRouter key and never spends one. Without a key the route
 * answers 400 `needsKey: true` and the UI says a key is needed —
 * the shared 50 requests/day allowance is never burned.
 *
 * Free-tier facts (Nov 2026, checked against OpenRouter's public
 * models API by third-party trackers; the lineup rotates every few
 * weeks — treat this list as a snapshot, not a guarantee):
 * - Only model IDs ending in `:free` cost $0/token.
 * - 20 requests/min, 50 requests/day per key (1,000/day once ≥$10 of
 *   credits have ever been bought).
 * - Only ~half the listed free models answer on a given day (Gemma 4
 *   free endpoints answered 0/20 in a Nov 2026 benchmark — all 429s);
 *   the six below answered reliably in that same window.
 * - Free providers may log/train on prompts — the UI says so.
 *
 * The picker below lists only the six reliable ones, default first.
 * The route still accepts any `:free` ID the user types, because the
 * lineup rotates; a retired ID fails honestly with the upstream
 * error instead of a made-up answer.
 */

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_COMPARE_TIMEOUT_MS = 30_000;
export const OPENROUTER_MAX_PROMPT_CHARS = 4000;

export type OpenRouterFreeModel = {
  id: string;
  label: string;
  blurb: string;
};

export const OPENROUTER_FREE_MODELS: OpenRouterFreeModel[] = [
  {
    id: "nvidia/nemotron-3.5-super-vl:free",
    label: "Nemotron 3.5 Super VL",
    blurb: "Best all-rounder in Nov 2026 tests; 1M context.",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Nemotron 3 Ultra 550B",
    blurb: "Largest free model; reasoning + planning.",
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    label: "Nemotron 3.5 Lightning",
    blurb: "Fast, high-throughput; short tasks.",
  },
  {
    id: "cohere/north-mini-code:free",
    label: "Cohere North Mini Code",
    blurb: "Agentic coding model.",
  },
  {
    id: "dots-studio/dots-3-note-preview:free",
    label: "Dots3-Note Preview",
    blurb: "Long notes/documents; listed until 31 Dec 2026.",
  },
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    label: "Nemotron 3 Nano Omni",
    blurb: "Multimodal reasoning, smaller and quick.",
  },
];

export const DEFAULT_COMPARE_MODEL_ID =
  OPENROUTER_FREE_MODELS[0]?.id ?? "";

/** Only `:free` model IDs may ever be requested. */
export function isFreeModelId(modelId: unknown): modelId is string {
  return (
    typeof modelId === "string" &&
    modelId.length > ":free".length &&
    modelId.endsWith(":free") &&
    !/\s/.test(modelId)
  );
}

/** Resolve the requested model: the pick, or the default. */
export function resolveCompareModel(modelId: unknown): string {
  return isFreeModelId(modelId) ? modelId : DEFAULT_COMPARE_MODEL_ID;
}

export type ComparePromptValidation =
  | { ok: true; prompt: string }
  | { ok: false; error: string };

export function validateComparePrompt(
  value: unknown
): ComparePromptValidation {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: "Prompt is required." };
  }
  const prompt = value.trim();
  if (prompt.length > OPENROUTER_MAX_PROMPT_CHARS) {
    return {
      ok: false,
      error: `Keep the prompt under ${OPENROUTER_MAX_PROMPT_CHARS} characters.`,
    };
  }
  return { ok: true, prompt };
}

/** OpenAI-compatible chat-completions body for OpenRouter. */
export function buildCompareRequestBody(
  model: string,
  prompt: string
): Record<string, unknown> {
  return {
    model,
    messages: [{ role: "user", content: prompt }],
  };
}

export type CompareAnswer = {
  model: string;
  content: string;
};

/**
 * Pull the assistant's text out of an OpenRouter chat-completions
 * response. Returns null when there is no usable choice — the route
 * then reports the upstream failure honestly.
 */
export function parseCompareAnswer(
  body: unknown,
  model: string
): CompareAnswer | null {
  if (!body || typeof body !== "object") return null;
  const choices = (body as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0];
  if (!first || typeof first !== "object") return null;
  const message = (first as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return null;
  const content = (message as Record<string, unknown>).content;
  if (typeof content !== "string" || !content.trim()) return null;
  return { model, content: content.trim() };
}

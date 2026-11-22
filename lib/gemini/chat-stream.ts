/**
 * Chat stream part-splitting (Wave 2 reasoning).
 *
 * TRAP (verified in the installed `@google/generative-ai` 0.24.1
 * bundle): `chunk.text()` concatenates ALL parts of a streamed chunk,
 * including thought parts. With `includeThoughts: true` the raw
 * thinking would leak into the visible answer. The chat route must
 * never call `chunk.text()` when thoughts are requested — it splits
 * the raw parts here instead.
 *
 * Raw stream chunks carry the API's `thought: true` flag on thought
 * parts (`chunk.candidates[0].content.parts[]`); the SDK does not
 * strip it from raw chunks (only `aggregateResponses` drops it, and
 * the chat route reads raw chunks).
 */

export type SplitChunkParts = {
  /** Text from parts flagged `thought: true` (the model's reasoning). */
  thinking: string;
  /** Text from ordinary answer parts. */
  text: string;
};

type RawPart = {
  text?: unknown;
  thought?: unknown;
};

function readParts(chunk: unknown): RawPart[] {
  if (!chunk || typeof chunk !== "object") return [];
  const candidates = (chunk as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const first = candidates[0];
  if (!first || typeof first !== "object") return [];
  const content = (first as Record<string, unknown>).content;
  if (!content || typeof content !== "object") return [];
  const parts = (content as Record<string, unknown>).parts;
  if (!Array.isArray(parts)) return [];
  return parts as RawPart[];
}

/**
 * Split one raw `generateContentStream` chunk into its thought and
 * answer text. Unknown/malformed chunks split to empty strings —
 * never throw on stream data.
 */
export function splitChunkParts(chunk: unknown): SplitChunkParts {
  let thinking = "";
  let text = "";

  for (const part of readParts(chunk)) {
    if (typeof part.text !== "string" || part.text.length === 0) {
      continue;
    }
    if (part.thought === true) {
      thinking += part.text;
    } else {
      text += part.text;
    }
  }

  return { thinking, text };
}

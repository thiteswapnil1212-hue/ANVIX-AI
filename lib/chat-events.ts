import type { GroundingSource } from "./gemini/grounding.ts";

/**
 * NDJSON event protocol for `/api/chat` (Wave 2 reasoning + grounding).
 *
 * Opt-in only: the client sends `events: true` to get one JSON object
 * per line; without it the route streams plain text exactly as before,
 * so an old client + new server still works and every intermediate
 * commit stays deploy-safe.
 *
 * Events:
 *   {"t":"thinking","text": "..."}   — thought-summary chunk
 *   {"t":"text","text": "..."}       — answer chunk
 *   {"t":"sources","sources": [...]} — grounded sources (sent once,
 *                                       when the stream ends)
 *   {"t":"error","message": "..."}   — stream failed mid-response
 *   {"t":"done"}                     — stream finished cleanly
 */

export type ChatEvent =
  | { t: "thinking"; text: string }
  | { t: "text"; text: string }
  | { t: "sources"; sources: GroundingSource[] }
  | { t: "error"; message: string }
  | { t: "done" };

export function encodeChatEvent(event: ChatEvent): string {
  return `${JSON.stringify(event)}\n`;
}

function isChatEvent(value: unknown): value is ChatEvent {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  switch (record.t) {
    case "thinking":
    case "text":
      return typeof record.text === "string";
    case "sources":
      return Array.isArray(record.sources);
    case "error":
      return typeof record.message === "string";
    case "done":
      return true;
    default:
      return false;
  }
}

/** Parse one NDJSON line into an event, or null if it is not one. */
export function parseChatEventLine(line: string): ChatEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return isChatEvent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export type ParsedChatEvents = {
  events: ChatEvent[];
  /** Incomplete trailing line — prepend it to the next chunk. */
  remainder: string;
};

/**
 * Parse a growing NDJSON buffer. Complete lines become events;
 * malformed lines are skipped (a truncated line mid-chunk is normal);
 * the incomplete tail is returned as `remainder` for the next call.
 */
export function parseChatEvents(buffer: string): ParsedChatEvents {
  const events: ChatEvent[] = [];
  const lines = buffer.split("\n");
  const remainder = lines.pop() ?? "";

  for (const line of lines) {
    const event = parseChatEventLine(line);
    if (event) events.push(event);
  }

  return { events, remainder };
}

/**
 * Groq streaming client (groq-r1-deep lane, 2026-11-27).
 *
 * Plain `fetch` against Groq's OpenAI-compatible chat-completions
 * endpoint — no SDK, no new npm dependency. Server-only: the key is
 * read from env by the caller and never leaves this module.
 *
 * Stream shape: server-sent events, one `data: {...}` JSON object
 * per line, terminated by `data: [DONE]`. Each delta carries
 * `choices[0].delta.content` (answer text, possibly containing
 * `<think>...</think>` reasoning) and, for reasoning models,
 * `choices[0].delta.reasoning_content` (reasoning without tags).
 * Both reasoning forms go to `onThinking`; only non-think content
 * reaches `onText` — a raw `<think>` tag can never appear in chat.
 *
 * Failure contract: any non-OK status, a missing body, or malformed
 * SSE throws `GroqError` with the upstream `status` attached. The
 * chat route treats EVERY Groq failure as fallback-worthy (429, 5xx,
 * timeout, auth/404) and runs the Gemini chain instead — the Groq
 * leg never errors the user outright. The client itself never
 * retries: one call, one outcome, the route decides what happens
 * next.
 */

import {
  GROQ_API_URL,
  GROQ_REASONING_MODEL_ID,
  GROQ_STREAM_TIMEOUT_MS,
} from "./config.ts";
import { createThinkSplitter } from "./think-tags.ts";

export class GroqError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GroqError";
    this.status = status;
  }
}

export type GroqStreamCallbacks = {
  /** Reasoning text for the Thinking block. */
  onThinking: (text: string) => void;
  /** Visible answer text (think blocks already stripped). */
  onText: (text: string) => void;
};

export type GroqStreamOptions = GroqStreamCallbacks & {
  apiKey: string;
  /** Full system instruction (Deep reasoning prompt included). */
  systemInstruction: string;
  prompt: string;
  /** Abort signal from the caller (route-level deadline / disconnect). */
  signal?: AbortSignal;
  /** Test seam: defaults to the global fetch. */
  fetchImpl?: typeof fetch;
};

/** Cap on how much of an upstream error body is kept in the message. */
const MAX_ERROR_BODY_CHARS = 500;

/**
 * Stream one Groq chat completion to completion. Resolves when the
 * upstream sends `[DONE]`; rejects with `GroqError` on any failure.
 * No retry, no fallback here — the caller owns that decision.
 */
export async function streamGroqChatCompletion({
  apiKey,
  systemInstruction,
  prompt,
  signal,
  fetchImpl = fetch,
  onThinking,
  onText,
}: GroqStreamOptions): Promise<void> {
  const timeoutSignal = AbortSignal.timeout(GROQ_STREAM_TIMEOUT_MS);
  const combinedSignal =
    signal === undefined
      ? timeoutSignal
      : AbortSignal.any([signal, timeoutSignal]);

  let response: Response;
  try {
    response = await fetchImpl(`${GROQ_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_REASONING_MODEL_ID,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
      signal: combinedSignal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new GroqError("Groq request timed out.");
    }
    throw new GroqError(
      `Groq request failed: ${error instanceof Error ? error.message : "network error"}`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new GroqError(
      `Groq request failed with status ${response.status}` +
        (body ? `: ${body.slice(0, MAX_ERROR_BODY_CHARS)}` : ""),
      response.status
    );
  }

  if (!response.body) {
    throw new GroqError("Groq response had no body.");
  }

  const splitter = createThinkSplitter();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let lineBuffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? "";
      for (const line of lines) {
        if (handleSseLine(line, splitter, onThinking, onText)) {
          return;
        }
      }
    }
    // Trailing bytes without a final newline.
    lineBuffer += decoder.decode();
    if (lineBuffer.trim()) {
      handleSseLine(lineBuffer, splitter, onThinking, onText);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Reader already released or cancelled.
    }
  }

  const tail = splitter.flush();
  if (tail.thinking) onThinking(tail.thinking);
  if (tail.text) onText(tail.text);
}

/**
 * Handle one SSE line. Returns true when the stream is finished
 * (`data: [DONE]`). Non-data lines and malformed JSON are skipped —
 * a truncated line mid-chunk is normal for a stream.
 */
function handleSseLine(
  line: string,
  splitter: ReturnType<typeof createThinkSplitter>,
  onThinking: (text: string) => void,
  onText: (text: string) => void
): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return false;
  const payload = trimmed.slice("data:".length).trim();
  if (payload === "[DONE]") return true;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== "object") return false;
  const choices = (parsed as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length === 0) return false;
  const first = choices[0];
  if (!first || typeof first !== "object") return false;
  const delta = (first as Record<string, unknown>).delta;
  if (!delta || typeof delta !== "object") return false;
  const deltaRecord = delta as Record<string, unknown>;

  // Reasoning content (no tags) goes straight to the Thinking block.
  if (typeof deltaRecord.reasoning_content === "string") {
    const reasoning = deltaRecord.reasoning_content as string;
    if (reasoning) onThinking(reasoning);
  }
  // Answer content may carry <think> blocks — strip them.
  if (typeof deltaRecord.content === "string") {
    const content = deltaRecord.content as string;
    if (content) {
      const { thinking, text } = splitter.push(content);
      if (thinking) onThinking(thinking);
      if (text) onText(text);
    }
  }
  return false;
}

/**
 * Streaming `<think>` splitter for reasoning models (groq-r1-deep
 * lane, 2026-11-27; chain swapped to GPT-OSS 120B + Qwen 3.8 27B
 * on 2026-11-28 after Groq decommissioned the R1-distill).
 *
 * Reasoning models emit their thinking before the visible answer —
 * Qwen's `raw` format puts it inside a `<think>...</think>` block
 * at the start of the reply (GPT-OSS instead uses a separate
 * `reasoning_content` delta, handled in the client; this splitter
 * only ever sees `content`). The block may be split across stream
 * chunks — including mid-tag (`<thi` in one chunk, `nk>` in the
 * next) — so this splitter is a small state machine, not a regex
 * over each chunk:
 *
 * - Text outside a think block is visible answer text.
 * - Text inside a think block is reasoning — it goes to the Thinking
 *   block, never into the visible answer.
 * - A trailing partial tag (`<`, `<t`, `</thi`, …) is held back until
 *   the next chunk proves whether it is a tag or literal text, so a
 *   split tag can never leak into the answer as raw markup.
 * - `flush()` at stream end treats an unterminated think block as
 *   reasoning (never leaks it into the answer) and any leftover
 *   partial tag as literal text.
 *
 * Pure function of the chunks seen — no I/O, no fetch — so it is
 * unit-tested directly. The Groq client feeds `delta.content` through
 * it; `delta.reasoning_content` (when the provider sends it) bypasses
 * it and goes straight to the Thinking block.
 */

export type ThinkSplit = {
  /** Reasoning text for the Thinking block ("" when none). */
  thinking: string;
  /** Visible answer text ("" when none). */
  text: string;
};

const THINK_OPEN = "<think>";
const THINK_CLOSE = "</think>";

/**
 * Longest trailing suffix of `value` that is a proper prefix of
 * `tag` ("" when none). Used to hold back a tag split across chunks.
 */
function trailingPartialTag(value: string, tag: string): string {
  const max = Math.min(value.length, tag.length - 1);
  for (let len = max; len >= 1; len -= 1) {
    if (tag.startsWith(value.slice(value.length - len))) {
      return value.slice(value.length - len);
    }
  }
  return "";
}

export type ThinkSplitter = {
  /** Feed one stream chunk; returns the completed segments. */
  push(chunk: string): ThinkSplit;
  /** End of stream; returns whatever is left. */
  flush(): ThinkSplit;
};

export function createThinkSplitter(): ThinkSplitter {
  let buffer = "";
  let inThink = false;

  function push(chunk: string): ThinkSplit {
    let thinking = "";
    let text = "";
    buffer += chunk;

    for (;;) {
      if (inThink) {
        const closeAt = buffer.indexOf(THINK_CLOSE);
        if (closeAt !== -1) {
          thinking += buffer.slice(0, closeAt);
          buffer = buffer.slice(closeAt + THINK_CLOSE.length);
          inThink = false;
          continue;
        }
        // No close yet: emit everything except a trailing partial
        // close tag, which may complete in the next chunk.
        const held = trailingPartialTag(buffer, THINK_CLOSE);
        thinking += buffer.slice(0, buffer.length - held.length);
        buffer = held;
        return { thinking, text };
      }

      const openAt = buffer.indexOf(THINK_OPEN);
      if (openAt !== -1) {
        text += buffer.slice(0, openAt);
        buffer = buffer.slice(openAt + THINK_OPEN.length);
        inThink = true;
        continue;
      }
      // No open yet: emit everything except a trailing partial open
      // tag, which may complete in the next chunk.
      const held = trailingPartialTag(buffer, THINK_OPEN);
      text += buffer.slice(0, buffer.length - held.length);
      buffer = held;
      return { thinking, text };
    }
  }

  function flush(): ThinkSplit {
    // Unterminated think block: the rest is reasoning, never answer.
    if (inThink) {
      const thinking = buffer;
      buffer = "";
      return { thinking, text: "" };
    }
    const text = buffer;
    buffer = "";
    return { thinking: "", text };
  }

  return { push, flush };
}

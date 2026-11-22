import test from "node:test";
import assert from "node:assert/strict";

import { splitChunkParts } from "./chat-stream.ts";

function chunkWithParts(parts: unknown[]) {
  return {
    candidates: [{ content: { parts } }],
  };
}

test("splitChunkParts separates thought parts from answer parts", () => {
  const split = splitChunkParts(
    chunkWithParts([
      { text: "Let me think…", thought: true },
      { text: "The answer is ", thought: false },
      { text: "42." },
    ])
  );

  assert.equal(split.thinking, "Let me think…");
  assert.equal(split.text, "The answer is 42.");
});

test("splitChunkParts keeps thought text out of the visible answer", () => {
  // This is the chunk.text() trap: a naive concatenation would leak
  // the thinking into the answer. The split must never do that.
  const split = splitChunkParts(
    chunkWithParts([
      { text: "SECRET REASONING", thought: true },
      { text: "public answer", thought: false },
    ])
  );

  assert.equal(split.text, "public answer");
  assert.ok(!split.text.includes("SECRET"));
  assert.equal(split.thinking, "SECRET REASONING");
});

test("splitChunkParts tolerates malformed chunks without throwing", () => {
  assert.deepEqual(splitChunkParts(undefined), {
    thinking: "",
    text: "",
  });
  assert.deepEqual(splitChunkParts(null), { thinking: "", text: "" });
  assert.deepEqual(splitChunkParts({}), { thinking: "", text: "" });
  assert.deepEqual(splitChunkParts({ candidates: [] }), {
    thinking: "",
    text: "",
  });
  assert.deepEqual(
    splitChunkParts(chunkWithParts([{ thought: true }, { text: 42 }])),
    { thinking: "", text: "" }
  );
  assert.deepEqual(
    splitChunkParts(chunkWithParts([{ text: "only answer" }])),
    { thinking: "", text: "only answer" }
  );
});

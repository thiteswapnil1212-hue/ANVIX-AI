import test from "node:test";
import assert from "node:assert/strict";

import { createThinkSplitter } from "./think-tags.ts";

test("think splitter passes plain text through untouched", () => {
  const splitter = createThinkSplitter();
  assert.deepEqual(splitter.push("Hello world"), {
    thinking: "",
    text: "Hello world",
  });
  assert.deepEqual(splitter.flush(), { thinking: "", text: "" });
});

test("think splitter separates a complete think block from the answer", () => {
  const splitter = createThinkSplitter();
  assert.deepEqual(
    splitter.push("<think>Let me work this out.</think>The answer is 42."),
    { thinking: "Let me work this out.", text: "The answer is 42." }
  );
  assert.deepEqual(splitter.flush(), { thinking: "", text: "" });
});

test("think splitter handles a think block split across chunks, mid-tag", () => {
  const splitter = createThinkSplitter();
  // First chunk ends inside the open tag — nothing may leak as text.
  assert.deepEqual(splitter.push("The ans"), {
    thinking: "",
    text: "The ans",
  });
  assert.deepEqual(splitter.push("<thi"), { thinking: "", text: "" });
  assert.deepEqual(splitter.push("nk>step one."), {
    thinking: "step one.",
    text: "",
  });
  assert.deepEqual(splitter.push("step two.</thi"), {
    thinking: "step two.",
    text: "",
  });
  assert.deepEqual(splitter.push("nk>42"), {
    thinking: "",
    text: "42",
  });
  assert.deepEqual(splitter.flush(), { thinking: "", text: "" });
});

test("think splitter keeps a bare '<' in ordinary text", () => {
  const splitter = createThinkSplitter();
  // "a < b" — the "<" is held until the next chunk proves it is not
  // a tag, then flushed as literal text.
  assert.deepEqual(splitter.push("a <"), { thinking: "", text: "a " });
  assert.deepEqual(splitter.push(" b"), { thinking: "", text: "< b" });
  assert.deepEqual(splitter.flush(), { thinking: "", text: "" });
});

test("flush treats an unterminated think block as reasoning, never answer", () => {
  const splitter = createThinkSplitter();
  assert.deepEqual(splitter.push("<think>still reasoning..."), {
    thinking: "still reasoning...",
    text: "",
  });
  assert.deepEqual(splitter.flush(), { thinking: "", text: "" });
});

test("think splitter handles an empty think block and multiple blocks", () => {
  const splitter = createThinkSplitter();
  assert.deepEqual(splitter.push("<think></think>Answer "), {
    thinking: "",
    text: "Answer ",
  });
  assert.deepEqual(
    splitter.push("more <think>second thought</think>done."),
    { thinking: "second thought", text: "more done." }
  );
  assert.deepEqual(splitter.flush(), { thinking: "", text: "" });
});

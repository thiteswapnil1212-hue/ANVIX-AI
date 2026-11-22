import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExtractionPrompt,
  isDuplicateFact,
  normalizeFact,
  parseExtractedFacts,
  selectRelevantMemories,
  shouldExtractNow,
  type MemoryRecord,
} from "./memory.ts";

function memory(
  fact: string,
  createdAt: string,
  id = Math.random().toString(36).slice(2)
): MemoryRecord {
  return { id, fact, sourceChatId: null, confidence: 0.8, createdAt };
}

test("normalizeFact collapses case and whitespace", () => {
  assert.equal(normalizeFact("  Prefers   TypeScript "), "prefers typescript");
});

test("isDuplicateFact catches exact and reworded repeats, not new facts", () => {
  const existing = ["Prefers TypeScript over JavaScript for new projects"];
  assert.equal(isDuplicateFact("prefers typescript over javascript for new projects", existing), true);
  assert.equal(
    isDuplicateFact("User prefers TypeScript over JavaScript for new projects in general", existing),
    true
  );
  assert.equal(isDuplicateFact("Building a portfolio site", existing), false);
  assert.equal(isDuplicateFact("", existing), true);
});

test("selectRelevantMemories ranks keyword hits first, recency breaks ties", () => {
  const memories = [
    memory("Prefers TypeScript over JavaScript", "2026-11-20T10:00:00Z", "old-ts"),
    memory("Likes filter coffee in the morning", "2026-11-21T10:00:00Z", "coffee"),
    memory("Building a portfolio site in Next.js", "2026-11-19T10:00:00Z", "portfolio"),
  ];
  const picked = selectRelevantMemories(memories, "help me pick TypeScript for my portfolio");
  assert.equal(picked[0]?.id, "old-ts");
  assert.ok(picked.some((entry) => entry.id === "portfolio"));
});

test("selectRelevantMemories falls back to the 2 most recent when nothing matches", () => {
  const memories = [
    memory("Prefers TypeScript", "2026-11-19T10:00:00Z", "a"),
    memory("Likes filter coffee", "2026-11-21T10:00:00Z", "b"),
    memory("Plays cricket on Sundays", "2026-11-20T10:00:00Z", "c"),
  ];
  const picked = selectRelevantMemories(memories, "what is the capital of France?");
  assert.deepEqual(picked.map((entry) => entry.id), ["b", "c"]);
});

test("selectRelevantMemories returns [] with no memories and honours the limit", () => {
  assert.deepEqual(selectRelevantMemories([], "hello"), []);
  const memories = [memory("Prefers TypeScript", "2026-11-21T10:00:00Z", "a")];
  assert.deepEqual(selectRelevantMemories(memories, "TypeScript", 0), []);
});

test("shouldExtractNow fires only on every 6th user turn, once per count", () => {
  assert.equal(shouldExtractNow(5, null), false);
  assert.equal(shouldExtractNow(6, null), true);
  assert.equal(shouldExtractNow(6, 6), false);
  assert.equal(shouldExtractNow(12, 6), true);
  assert.equal(shouldExtractNow(0, null), false);
});

test("parseExtractedFacts accepts arrays, {facts} objects, and rejects junk", () => {
  assert.deepEqual(parseExtractedFacts('["Prefers TypeScript", "Building a portfolio site"]'), [
    "Prefers TypeScript",
    "Building a portfolio site",
  ]);
  assert.deepEqual(
    parseExtractedFacts(JSON.stringify({ facts: [{ fact: "Likes cricket", confidence: 0.9 }] })),
    ["Likes cricket"]
  );
  assert.deepEqual(parseExtractedFacts("not json at all"), []);
  assert.deepEqual(parseExtractedFacts("[]"), []);
  assert.deepEqual(parseExtractedFacts('["  ", "x"]'), []);
});

test("buildExtractionPrompt includes the transcript and asks for JSON only", () => {
  const prompt = buildExtractionPrompt([
    { role: "user", content: "I prefer TypeScript" },
    { role: "assistant", content: "Noted." },
  ]);
  assert.ok(prompt.includes("user: I prefer TypeScript"));
  assert.ok(prompt.includes("JSON array"));
});

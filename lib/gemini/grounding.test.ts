import test from "node:test";
import assert from "node:assert/strict";

import {
  extractGroundingSources,
  groundingTools,
  mergeGroundingSources,
} from "./grounding.ts";

function chunkWithGrounding(groundingChunks: unknown[]) {
  return {
    candidates: [{ groundingMetadata: { groundingChunks } }],
  };
}

test("groundingTools returns search + URL context when web is on", () => {
  const tools = groundingTools(true);
  assert.equal(tools.length, 2);
  // Values pass verbatim to the API; the legacy SDK types predate
  // these tool names, so the shim casts them.
  assert.deepEqual(tools[0], { googleSearch: {} });
  assert.deepEqual(tools[1], { urlContext: {} });
  assert.deepEqual(groundingTools(false), []);
});

test("extractGroundingSources reads web chunks from groundingMetadata", () => {
  const sources = extractGroundingSources(
    chunkWithGrounding([
      { web: { uri: "https://example.com/a", title: "Example A" } },
      { web: { uri: "https://example.com/b", title: "Example B" } },
    ])
  );

  assert.deepEqual(sources, [
    { title: "Example A", uri: "https://example.com/a" },
    { title: "Example B", uri: "https://example.com/b" },
  ]);
});

test("extractGroundingSources skips unusable chunks and labels bare uris", () => {
  const sources = extractGroundingSources(
    chunkWithGrounding([
      { web: { uri: "https://docs.example.org/guide" } },
      { web: { title: "No uri here" } },
      { web: { uri: "   " } },
      { notWeb: { uri: "https://example.com/c" } },
    ])
  );

  assert.deepEqual(sources, [
    { title: "docs.example.org", uri: "https://docs.example.org/guide" },
  ]);

  assert.deepEqual(extractGroundingSources(undefined), []);
  assert.deepEqual(extractGroundingSources({}), []);
  assert.deepEqual(
    extractGroundingSources({ candidates: [{ groundingMetadata: {} }] }),
    []
  );
});

test("mergeGroundingSources dedupes by uri, first title wins", () => {
  const merged = mergeGroundingSources(
    [{ title: "A", uri: "https://example.com/a" }],
    [
      { title: "A again", uri: "https://example.com/a" },
      { title: "B", uri: "https://example.com/b" },
    ]
  );

  assert.deepEqual(merged, [
    { title: "A", uri: "https://example.com/a" },
    { title: "B", uri: "https://example.com/b" },
  ]);
});

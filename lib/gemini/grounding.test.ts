import test from "node:test";
import assert from "node:assert/strict";

import {
  extractGroundingSources,
  groundingTools,
  isGroundingToolRejection,
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

test("isGroundingToolRejection flags only a 400 (tools rejected)", () => {
  // Shape of the SDK's fetch error: numeric status on the error.
  const err400 = Object.assign(
    new Error(
      "Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent: [400 Bad Request] Invalid argument"
    ),
    { status: 400 }
  );
  assert.equal(isGroundingToolRejection(err400), true);

  const err429 = Object.assign(new Error("429 RESOURCE_EXHAUSTED"), {
    status: 429,
  });
  assert.equal(isGroundingToolRejection(err429), false);

  const err500 = Object.assign(new Error("500 Internal error"), {
    status: 500,
  });
  assert.equal(isGroundingToolRejection(err500), false);

  // A 400 in the message alone, without a numeric status, is not
  // trusted — the SDK always attaches the status to fetch errors.
  assert.equal(
    isGroundingToolRejection(new Error("[400 Bad Request] nope")),
    false
  );
  assert.equal(isGroundingToolRejection(new Error("boom")), false);
  assert.equal(isGroundingToolRejection(undefined), false);
});

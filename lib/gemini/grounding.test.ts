import test from "node:test";
import assert from "node:assert/strict";

import {
  extractGroundingSources,
  groundingTools,
  shouldDegradeGrounding,
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

test("shouldDegradeGrounding retries any pre-emit failure except auth/config errors", () => {
  // Shape of the SDK's fetch error: numeric status on the error.
  const withStatus = (message: string, status: number) =>
    Object.assign(new Error(message), { status });

  // 400 tool rejection, 429 quota, 5xx — all degrade: the plain
  // call succeeds where the grounded one fails (live, 2026-11-22).
  assert.equal(
    shouldDegradeGrounding(withStatus("400 Bad Request", 400)),
    true
  );
  assert.equal(
    shouldDegradeGrounding(withStatus("429 RESOURCE_EXHAUSTED", 429)),
    true
  );
  assert.equal(
    shouldDegradeGrounding(withStatus("500 Internal error", 500)),
    true
  );

  // No numeric status at all still degrades — nothing about the
  // error says the request can never succeed without tools.
  assert.equal(shouldDegradeGrounding(new Error("boom")), true);
  assert.equal(shouldDegradeGrounding(undefined), true);

  // Auth/config errors can never succeed without tools either, so
  // no retry: the fallback / final error handles them as before.
  assert.equal(
    shouldDegradeGrounding(withStatus("401 Unauthorized", 401)),
    false
  );
  assert.equal(
    shouldDegradeGrounding(withStatus("403 Forbidden", 403)),
    false
  );
  assert.equal(
    shouldDegradeGrounding(withStatus("404 Not Found", 404)),
    false
  );
});

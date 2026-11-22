import test from "node:test";
import assert from "node:assert/strict";
import {
  API_KEY_PREFIX,
  extractApiKey,
  generateApiKey,
  hashApiKey,
  keyDisplayPrefix,
} from "./api-keys.ts";

test("generateApiKey produces a unique prefixed key each time", () => {
  const a = generateApiKey();
  const b = generateApiKey();
  assert.ok(a.startsWith(API_KEY_PREFIX));
  assert.notEqual(a, b);
  assert.ok(a.length > API_KEY_PREFIX.length + 20);
});

test("hashApiKey is deterministic and never reveals the key", () => {
  const key = generateApiKey();
  const hash = hashApiKey(key);
  assert.equal(hash, hashApiKey(key));
  assert.equal(hash.length, 64);
  assert.ok(!hash.includes(key.slice(API_KEY_PREFIX.length)));
  assert.notEqual(hashApiKey(generateApiKey()), hash);
});

test("keyDisplayPrefix shows only the first 12 characters", () => {
  const key = generateApiKey();
  assert.equal(keyDisplayPrefix(key), key.slice(0, 12));
});

test("extractApiKey prefers X-API-Key, then Bearer anvix_live_ tokens", () => {
  const key = generateApiKey();
  const viaHeader = new Request("https://example.com/api/v1/chat", {
    headers: { "X-API-Key": key },
  });
  assert.equal(extractApiKey(viaHeader), key);

  const viaBearer = new Request("https://example.com/api/v1/chat", {
    headers: { Authorization: `Bearer ${key}` },
  });
  assert.equal(extractApiKey(viaBearer), key);

  // A Supabase JWT in Authorization must NOT be mistaken for an API key.
  const jwt = new Request("https://example.com/api/v1/chat", {
    headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig" },
  });
  assert.equal(extractApiKey(jwt), null);

  const none = new Request("https://example.com/api/v1/chat");
  assert.equal(extractApiKey(none), null);
});

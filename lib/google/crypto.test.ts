import test from "node:test";
import assert from "node:assert/strict";
import {
  decryptToken,
  encryptToken,
  getEncryptionKey,
  parseEncryptionKey,
  safeEqual,
} from "./crypto.ts";

// Fixed 32-byte key so tests are deterministic (never a real secret).
const KEY_B64 = Buffer.from("a".repeat(32), "utf8").toString("base64");
const KEY = parseEncryptionKey(KEY_B64);
assert.ok(KEY);

test("parseEncryptionKey accepts base64 and hex, rejects short keys", () => {
  assert.equal(parseEncryptionKey(KEY_B64)?.length, 32);
  const hex = Buffer.from("b".repeat(32), "utf8").toString("hex");
  assert.equal(parseEncryptionKey(hex)?.length, 32);
  assert.equal(parseEncryptionKey("too-short"), null);
  assert.equal(parseEncryptionKey(undefined), null);
  assert.equal(parseEncryptionKey(""), null);
});

test("getEncryptionKey returns null without the env var", () => {
  const saved = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  try {
    assert.equal(getEncryptionKey(), null);
  } finally {
    if (saved !== undefined) process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = saved;
  }
});

test("encryptToken round-trips and is non-deterministic (random IV)", () => {
  const secret = "1//0e-refresh-token-value";
  const a = encryptToken(secret, KEY);
  const b = encryptToken(secret, KEY);
  assert.notEqual(a, b, "same plaintext must not encrypt identically");
  assert.equal(decryptToken(a, KEY), secret);
  assert.equal(decryptToken(b, KEY), secret);
});

test("decryptToken returns null for tampered or malformed payloads", () => {
  const payload = encryptToken("hello", KEY);
  const tampered =
    payload.slice(0, -2) + (payload.slice(-2, -1) === "A" ? "B" : "A") + "A";
  assert.equal(decryptToken(tampered, KEY), null);
  assert.equal(decryptToken("not-base64!!!", KEY), null);
  assert.equal(decryptToken("", KEY), null);
  // Wrong key must not decrypt.
  const other = parseEncryptionKey(
    Buffer.from("z".repeat(32), "utf8").toString("base64")
  );
  assert.equal(decryptToken(payload, other), null);
});

test("encryptToken throws without a configured key", () => {
  assert.throws(() => encryptToken("x", null), /not configured/);
  assert.throws(() => decryptToken("x", null), /not configured/);
});

test("safeEqual is constant-time-ish and exact", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "abcd"), false);
});

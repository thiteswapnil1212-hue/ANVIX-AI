import test from "node:test";
import assert from "node:assert/strict";

import {
  decryptApiKey,
  encryptApiKey,
  getByokEncryptionSecret,
  isByokEncryptionConfigured,
  keyLast4,
} from "./crypto.ts";

const SECRET = "test-secret-that-is-long-enough-0123456789";
const OTHER_SECRET = "a-different-long-enough-secret-9876543210";
const KEY = "AIzaSyTestKeyForUnitTestsOnly1234567890";

test("encryption round-trips the key and never returns the plaintext", () => {
  const encrypted = encryptApiKey(KEY, SECRET);
  assert.notEqual(encrypted, KEY);
  assert.equal(decryptApiKey(encrypted, SECRET), KEY);
});

test("two encryptions of the same key differ (random IV)", () => {
  assert.notEqual(encryptApiKey(KEY, SECRET), encryptApiKey(KEY, SECRET));
});

test("decrypt fails with the wrong secret, a flipped bit, or garbage", () => {
  const encrypted = encryptApiKey(KEY, SECRET);
  assert.equal(decryptApiKey(encrypted, OTHER_SECRET), null);

  const bytes = Buffer.from(encrypted, "base64");
  bytes[bytes.length - 1] = bytes[bytes.length - 1] as number ^ 0x01;
  assert.equal(decryptApiKey(bytes.toString("base64"), SECRET), null);

  assert.equal(decryptApiKey("not-base64!!!", SECRET), null);
  assert.equal(decryptApiKey("", SECRET), null);
  assert.equal(decryptApiKey(encrypted, "short"), null);
});

test("encrypt refuses an empty key or an unconfigured secret", () => {
  assert.throws(() => encryptApiKey("", SECRET), /empty/);
  assert.throws(() => encryptApiKey("   ", SECRET), /empty/);
  assert.throws(() => encryptApiKey(KEY, ""), /not configured/);
  assert.throws(() => encryptApiKey(KEY, "short"), /not configured/);
});

test("configuration check needs a secret of at least 16 chars", () => {
  assert.equal(isByokEncryptionConfigured(undefined), false);
  assert.equal(isByokEncryptionConfigured(""), false);
  assert.equal(isByokEncryptionConfigured("short-secret"), false);
  assert.equal(isByokEncryptionConfigured("1234567890123456"), true);
  assert.equal(getByokEncryptionSecret({}), null);
  assert.equal(
    getByokEncryptionSecret({ BYOK_ENCRYPTION_KEY: SECRET }),
    SECRET
  );
  assert.equal(
    getByokEncryptionSecret({ BYOK_ENCRYPTION_KEY: "short" }),
    null
  );
});

test("keyLast4 shows only the tail for display", () => {
  assert.equal(keyLast4(KEY), "7890");
  assert.equal(keyLast4("ab"), "ab");
});

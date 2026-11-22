import test from "node:test";
import assert from "node:assert/strict";

import {
  decryptUserKey,
  encryptUserKey,
  isKeyEncryptionConfigured,
} from "./user-keys.ts";

const TEST_KEY = Buffer.alloc(32, 7).toString("base64");

test("encrypt/decrypt round-trips a key", async () => {
  process.env.ANVIX_KEY_ENCRYPTION_KEY = TEST_KEY;

  const blob = await encryptUserKey("sk-or-v1-test-key-123");
  assert.equal(typeof blob, "string");
  assert.ok(blob.length > 0);
  // The blob must not contain the plaintext.
  assert.ok(!blob.includes("sk-or-v1"));
  assert.equal(await decryptUserKey(blob), "sk-or-v1-test-key-123");
});

test("each encryption uses a fresh IV (different blobs)", async () => {
  process.env.ANVIX_KEY_ENCRYPTION_KEY = TEST_KEY;

  const a = await encryptUserKey("same-key");
  const b = await encryptUserKey("same-key");
  assert.notEqual(a, b);
  assert.equal(await decryptUserKey(a), "same-key");
  assert.equal(await decryptUserKey(b), "same-key");
});

test("decrypt returns null for garbage or a wrong key", async () => {
  process.env.ANVIX_KEY_ENCRYPTION_KEY = TEST_KEY;

  assert.equal(await decryptUserKey("not-a-blob"), null);
  assert.equal(await decryptUserKey(""), null);

  const blob = await encryptUserKey("secret");
  process.env.ANVIX_KEY_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString(
    "base64"
  );
  assert.equal(await decryptUserKey(blob), null);
});

test("isKeyEncryptionConfigured reflects the env var", () => {
  delete process.env.ANVIX_KEY_ENCRYPTION_KEY;
  assert.equal(isKeyEncryptionConfigured(), false);

  process.env.ANVIX_KEY_ENCRYPTION_KEY = TEST_KEY;
  assert.equal(isKeyEncryptionConfigured(), true);

  process.env.ANVIX_KEY_ENCRYPTION_KEY = "too-short";
  assert.equal(isKeyEncryptionConfigured(), false);

  delete process.env.ANVIX_KEY_ENCRYPTION_KEY;
});

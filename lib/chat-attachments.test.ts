import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_ATTACHMENTS,
  attachmentsToInlineDataParts,
  estimateDecodedBytes,
  isImageMime,
  isSupportedAttachmentMime,
  validateAttachments,
} from "./chat-attachments.ts";

const smallPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("validateAttachments accepts a valid image and PDF", () => {
  const result = validateAttachments([
    { name: "photo.png", mimeType: "image/png", data: smallPng },
    { name: "doc.pdf", mimeType: "application/pdf", data: smallPng },
  ]);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.attachments.length, 2);
    assert.equal(result.attachments[0].name, "photo.png");
  }
});

test("validateAttachments treats a missing field as no attachments", () => {
  assert.deepEqual(validateAttachments(undefined), {
    ok: true,
    attachments: [],
  });
  assert.deepEqual(validateAttachments(null), {
    ok: true,
    attachments: [],
  });
});

test("validateAttachments rejects too many files", () => {
  const four = Array.from({ length: MAX_ATTACHMENTS + 1 }, (_, i) => ({
    name: `f${i}.png`,
    mimeType: "image/png",
    data: smallPng,
  }));

  const result = validateAttachments(four);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /at most 3/);
  }
});

test("validateAttachments rejects unsupported types and bad data", () => {
  const badMime = validateAttachments([
    { name: "song.mp3", mimeType: "audio/mpeg", data: smallPng },
  ]);
  assert.equal(badMime.ok, false);

  const badData = validateAttachments([
    { name: "photo.png", mimeType: "image/png", data: "not base64!!" },
  ]);
  assert.equal(badData.ok, false);

  const notAList = validateAttachments({ name: "x.png" });
  assert.equal(notAList.ok, false);

  const gif = validateAttachments([
    { name: "anim.gif", mimeType: "image/gif", data: smallPng },
  ]);
  assert.equal(gif.ok, false);
});

test("validateAttachments enforces the per-file size caps", () => {
  // ~3.1 MB decoded of base64: over the 2 MB image cap, under no
  // total cap issue (single file).
  const big = "A".repeat(4_200_000);
  const result = validateAttachments([
    { name: "huge.png", mimeType: "image/png", data: big },
  ]);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /over the 2 MB limit/);
  }
});

test("mime helpers and byte estimate", () => {
  assert.equal(isSupportedAttachmentMime("image/jpeg"), true);
  assert.equal(isSupportedAttachmentMime("application/pdf"), true);
  assert.equal(isSupportedAttachmentMime("image/gif"), false);
  assert.equal(isSupportedAttachmentMime("text/plain"), false);
  assert.equal(isImageMime("image/webp"), true);
  assert.equal(isImageMime("application/pdf"), false);
  // "QUJD" is 4 base64 chars -> 3 bytes.
  assert.equal(estimateDecodedBytes("QUJD"), 3);
});

test("attachmentsToInlineDataParts shapes Gemini inlineData parts", () => {
  const parts = attachmentsToInlineDataParts([
    { name: "a.png", mimeType: "image/png", data: smallPng },
  ]);

  assert.deepEqual(parts, [
    { inlineData: { mimeType: "image/png", data: smallPng } },
  ]);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  TELEGRAM_MAX_MESSAGE_LENGTH,
  chunkTelegramMessage,
  generateLinkCode,
  parseTelegramStartCode,
} from "./telegram.ts";

test("generateLinkCode returns 8 unambiguous characters", () => {
  const code = generateLinkCode();
  assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
  // Deterministic source: cycles through the alphabet start.
  const deterministic = generateLinkCode(() => 0);
  assert.equal(deterministic, "AAAAAAAA");
});

test("chunkTelegramMessage keeps short messages whole", () => {
  assert.deepEqual(chunkTelegramMessage("hello"), ["hello"]);
  assert.deepEqual(
    chunkTelegramMessage("x".repeat(TELEGRAM_MAX_MESSAGE_LENGTH)),
    ["x".repeat(TELEGRAM_MAX_MESSAGE_LENGTH)]
  );
});

test("chunkTelegramMessage splits on newlines under the limit", () => {
  const line = "line of text";
  const text = Array.from({ length: 600 }, () => line).join("\n");
  const chunks = chunkTelegramMessage(text);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(chunk.length <= TELEGRAM_MAX_MESSAGE_LENGTH);
  }
  assert.equal(chunks.join("\n"), text);
});

test("chunkTelegramMessage hard-splits a single over-long word", () => {
  const text = "a".repeat(TELEGRAM_MAX_MESSAGE_LENGTH + 10);
  const chunks = chunkTelegramMessage(text);
  assert.equal(chunks.length, 2);
  assert.equal(chunks.join(""), text);
  for (const chunk of chunks) {
    assert.ok(chunk.length <= TELEGRAM_MAX_MESSAGE_LENGTH);
  }
});

test("parseTelegramStartCode accepts /start CODE and bot-mention form", () => {
  assert.equal(parseTelegramStartCode("/start AB12CD34"), "AB12CD34");
  assert.equal(
    parseTelegramStartCode("/start@AnvixBot ab12cd34"),
    "AB12CD34"
  );
  assert.equal(parseTelegramStartCode("/start"), null);
  assert.equal(parseTelegramStartCode("/start short"), null);
  assert.equal(parseTelegramStartCode("/unlink"), null);
  assert.equal(parseTelegramStartCode(null), null);
  assert.equal(parseTelegramStartCode("/start AB12CD34 extra"), null);
});

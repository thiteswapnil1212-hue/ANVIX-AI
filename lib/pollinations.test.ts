import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPollinationsUrl,
  isPollinationsRateLimit,
  parseRetryAfter,
  POLLINATIONS_MAX_PROMPT_CHARS,
  validateImagePrompt,
} from "./pollinations.ts";

test("buildPollinationsUrl encodes the prompt and pins Sana at 768", () => {
  const url = buildPollinationsUrl("a red kite over Pune");
  assert.ok(url.startsWith("https://image.pollinations.ai/prompt/a%20red%20kite%20over%20Pune?"));
  assert.ok(url.includes("model=sana"));
  assert.ok(url.includes("width=768"));
  assert.ok(url.includes("height=768"));
});

test("buildPollinationsUrl clamps dimensions to 768 max", () => {
  const url = buildPollinationsUrl("x", { width: 2048, height: 10 });
  assert.ok(url.includes("width=768"));
  assert.ok(url.includes("height=64"));
});

test("validateImagePrompt rejects empty and over-long prompts", () => {
  assert.deepEqual(validateImagePrompt("  "), {
    ok: false,
    error: "Describe the image you want.",
  });
  assert.deepEqual(validateImagePrompt(42), {
    ok: false,
    error: "Describe the image you want.",
  });
  assert.equal(
    validateImagePrompt("a".repeat(POLLINATIONS_MAX_PROMPT_CHARS + 1)).ok,
    false
  );
  assert.deepEqual(validateImagePrompt("  a cat  "), {
    ok: true,
    prompt: "a cat",
  });
});

test("parseRetryAfter handles seconds, dates, and junk", () => {
  assert.equal(parseRetryAfter(null), 45);
  assert.equal(parseRetryAfter("20"), 20);
  assert.equal(parseRetryAfter("9999"), 300);
  assert.equal(
    parseRetryAfter("Sun, 22 Nov 2026 12:01:00 GMT", Date.parse("2026-11-22T12:00:00Z")),
    60
  );
  assert.equal(parseRetryAfter("junk"), 45);
});

test("Pollinations slow-down is 402 or 429", () => {
  assert.equal(isPollinationsRateLimit(402), true);
  assert.equal(isPollinationsRateLimit(429), true);
  assert.equal(isPollinationsRateLimit(500), false);
});

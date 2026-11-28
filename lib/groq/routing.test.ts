import test from "node:test";
import assert from "node:assert/strict";

import {
  GROQ_REASONING_MODEL_ID,
  isGroqConfigured,
  shouldTryGroqDeep,
} from "./config.ts";

test("Groq reasoning model is the 70B R1 distill, not the full R1", () => {
  // Guard the honest-scope note: if the model id ever changes to the
  // full R1 (or anything else), this test forces the copy + comments
  // to be updated with it instead of silently claiming R1.
  assert.equal(
    GROQ_REASONING_MODEL_ID,
    "deepseek-r1-distill-llama-70b"
  );
});

test("isGroqConfigured needs a non-blank key", () => {
  assert.equal(isGroqConfigured("gsk-abc"), true);
  assert.equal(isGroqConfigured("  "), false);
  assert.equal(isGroqConfigured(""), false);
  assert.equal(isGroqConfigured(undefined), false);
});

test("shouldTryGroqDeep needs Deep mode + a key + no attachments", () => {
  const base = { modeId: "deep", hasGroqKey: true, hasAttachments: false };
  assert.equal(shouldTryGroqDeep(base), true);
  assert.equal(shouldTryGroqDeep({ ...base, modeId: "smart" }), false);
  assert.equal(shouldTryGroqDeep({ ...base, modeId: "fast" }), false);
  assert.equal(shouldTryGroqDeep({ ...base, hasGroqKey: false }), false);
  // Text-only model: an attachment stays on the Gemini path.
  assert.equal(
    shouldTryGroqDeep({ ...base, hasAttachments: true }),
    false
  );
});

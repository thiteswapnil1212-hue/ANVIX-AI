import test from "node:test";
import assert from "node:assert/strict";

import {
  GROQ_DECOMMISSIONED_MODEL_IDS,
  GROQ_DEEP_MODEL_CHAIN,
  GROQ_MAX_COMPLETION_TOKENS,
  groqReasoningEffortForThinking,
  isGroqConfigured,
  shouldTryGroqDeep,
} from "./config.ts";

test("Groq Deep chain is GPT-OSS 120B primary, Qwen 3.8 27B secondary", () => {
  // The R1-distill id died (Groq decommissioned it 2025-10-02; the
  // live 400 model_decommissioned proved it 2026-11-28). If this
  // chain ever changes again, update the copy + comments with it.
  assert.deepEqual([...GROQ_DEEP_MODEL_CHAIN], [
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
  ]);
});

test("no decommissioned Groq model id is in the Deep chain", () => {
  // Tripwire against stale community lists: every id Groq has shut
  // down (per Groq's own deprecations page) must stay out of the
  // chain. The list includes the R1-distill and every other
  // candidate the old search results suggested.
  for (const dead of GROQ_DECOMMISSIONED_MODEL_IDS) {
    assert.ok(
      !(GROQ_DEEP_MODEL_CHAIN as readonly string[]).includes(dead),
      `${dead} must not be in the Groq Deep chain`
    );
  }
  assert.ok(GROQ_DECOMMISSIONED_MODEL_IDS.length >= 5);
});

test("Groq completion budget is 16384, within both chain models' maxima", () => {
  // Loop-verify-groq-fix (2026-11-28): Groq's default budget is
  // 1024 and reasoning tokens count against it, so hard questions
  // ended with no answer text. 16,384 is the lower of the two chain
  // models' maxima on Groq's models page (GPT-OSS 120B: 65,536;
  // Qwen 3.8 27B: 16,384) — one shared value valid for both. A
  // future raise must stay at or below Qwen's max, or move to
  // per-model budgets.
  assert.equal(GROQ_MAX_COMPLETION_TOKENS, 16_384);
  assert.ok(GROQ_MAX_COMPLETION_TOKENS <= 16_384);
  assert.ok(GROQ_MAX_COMPLETION_TOKENS > 1024);
});

test("thinking choice maps to Groq reasoning_effort", () => {
  // Verified against Groq's own reasoning docs: low/medium/high are
  // supported by GPT-OSS 120B and Qwen 3.8 27B alike. Off is `low`,
  // not `none` — Deep mode must always reason, just lightly.
  assert.equal(groqReasoningEffortForThinking("off"), "low");
  assert.equal(groqReasoningEffortForThinking("fast"), "medium");
  assert.equal(groqReasoningEffortForThinking("deep"), "high");
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
  // Text-only models: an attachment stays on the Gemini path.
  assert.equal(
    shouldTryGroqDeep({ ...base, hasAttachments: true }),
    false
  );
});

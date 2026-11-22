import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCompareRequestBody,
  DEFAULT_COMPARE_MODEL_ID,
  isFreeModelId,
  OPENROUTER_FREE_MODELS,
  parseCompareAnswer,
  resolveCompareModel,
  validateComparePrompt,
} from "./openrouter.ts";

test("the free-model list is all :free ids, default first", () => {
  assert.ok(OPENROUTER_FREE_MODELS.length >= 5);
  for (const model of OPENROUTER_FREE_MODELS) {
    assert.ok(isFreeModelId(model.id), model.id);
  }
  assert.equal(DEFAULT_COMPARE_MODEL_ID, OPENROUTER_FREE_MODELS[0]?.id);
  assert.equal(
    DEFAULT_COMPARE_MODEL_ID,
    "nvidia/nemotron-3.5-super-vl:free"
  );
});

test("isFreeModelId rejects paid ids and junk", () => {
  assert.equal(isFreeModelId("openai/gpt-5"), false);
  assert.equal(isFreeModelId("nvidia/nemotron-3.5-super-vl"), false);
  assert.equal(isFreeModelId(":free"), false);
  assert.equal(isFreeModelId("model with space:free"), false);
  assert.equal(isFreeModelId(42), false);
  assert.equal(isFreeModelId(undefined), false);
  assert.equal(
    isFreeModelId("nvidia/nemotron-3.5-lightning:free"),
    true
  );
});

test("resolveCompareModel falls back to the default for anything else", () => {
  assert.equal(
    resolveCompareModel("cohere/north-mini-code:free"),
    "cohere/north-mini-code:free"
  );
  assert.equal(resolveCompareModel("openai/gpt-5"), DEFAULT_COMPARE_MODEL_ID);
  assert.equal(resolveCompareModel(undefined), DEFAULT_COMPARE_MODEL_ID);
});

test("validateComparePrompt trims and caps length", () => {
  assert.deepEqual(validateComparePrompt("  "), {
    ok: false,
    error: "Prompt is required.",
  });
  assert.deepEqual(validateComparePrompt("  hi  "), {
    ok: true,
    prompt: "hi",
  });
  assert.equal(validateComparePrompt("x".repeat(4001)).ok, false);
});

test("buildCompareRequestBody is a plain chat-completions call", () => {
  assert.deepEqual(
    buildCompareRequestBody("nvidia/nemotron-3.5-super-vl:free", "hello"),
    {
      model: "nvidia/nemotron-3.5-super-vl:free",
      messages: [{ role: "user", content: "hello" }],
    }
  );
});

test("parseCompareAnswer extracts the first choice, null when empty", () => {
  const body = {
    choices: [
      { message: { role: "assistant", content: "  second answer  " } },
    ],
  };
  assert.deepEqual(parseCompareAnswer(body, "m:free"), {
    model: "m:free",
    content: "second answer",
  });
  assert.equal(parseCompareAnswer({ choices: [] }, "m:free"), null);
  assert.equal(
    parseCompareAnswer(
      { choices: [{ message: { content: "   " } }] },
      "m:free"
    ),
    null
  );
  assert.equal(parseCompareAnswer(null, "m:free"), null);
});

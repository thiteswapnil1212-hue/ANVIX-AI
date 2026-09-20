import test from "node:test";
import assert from "node:assert/strict";

import {
  CHAT_API_MODEL_IDS,
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  getChatModel,
} from "./chat-models.ts";

test("default and supported chat models use a real Gemini API id", () => {
  const defaultModel = getChatModel(DEFAULT_CHAT_MODEL_ID);
  assert.ok(defaultModel, "default model must exist");
  assert.equal(defaultModel?.locked, false);
  assert.equal(defaultModel?.apiModelId, "gemini-2.5-flash");

  const supportedModels = CHAT_MODELS.filter((model) =>
    CHAT_API_MODEL_IDS.has(model.id)
  );

  assert.ok(supportedModels.length > 0, "at least one model is allowed");
  assert.ok(
    supportedModels.every((model) => model.provider === "Google Gemini"),
    "only Google Gemini models are API-enabled"
  );
  assert.ok(
    !CHAT_API_MODEL_IDS.has("gemini-3.8-flash"),
    "the fake Gemini 3.8 model must not be treated as valid"
  );
  assert.ok(
    !CHAT_API_MODEL_IDS.has("gemini-3.7-flash"),
    "the fake Gemini 3.7 model must not be treated as valid"
  );
  assert.ok(
    !CHAT_API_MODEL_IDS.has("gemini-3.6-flash"),
    "the fake Gemini 3.6 model must not be treated as valid"
  );
  assert.ok(
    !CHAT_API_MODEL_IDS.has("gemini-3.5-flash-lite"),
    "the fake Gemini 3.5 Flash Lite model must not be treated as valid"
  );
});

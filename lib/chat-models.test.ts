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
  // Wave 1 migration (2026-11-21): gemini-2.5-flash shut down 1 Dec 2026.
  assert.equal(defaultModel?.apiModelId, "gemini-3.5-flash-lite");

  const supportedModels = CHAT_MODELS.filter((model) =>
    CHAT_API_MODEL_IDS.has(model.id)
  );

  assert.ok(supportedModels.length > 0, "at least one model is allowed");
  assert.ok(
    supportedModels.every((model) => model.provider === "Google Gemini"),
    "only Google Gemini models are API-enabled"
  );
  assert.ok(
    !CHAT_API_MODEL_IDS.has("gemini-2.5-flash"),
    "the retired Gemini 2.5 Flash model must not be treated as valid"
  );
  assert.ok(
    !CHAT_API_MODEL_IDS.has("gemini-3.7-flash"),
    "an unlisted model id must not be treated as valid"
  );
  assert.ok(
    !CHAT_API_MODEL_IDS.has("gemini-3.8-flash"),
    "Gemini 3.8 Flash is real but not chat-selectable — it is only the " +
      "build/agent fallback, so the chat route must reject it"
  );
});

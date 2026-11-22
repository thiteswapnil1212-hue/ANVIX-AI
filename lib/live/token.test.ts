import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_MODEL_FALLBACK,
  LIVE_MODEL_PRIMARY,
  LIVE_SESSION_CAP_MS,
  isLiveModelId,
} from "./live-models.ts";
import {
  buildLiveTokenConfig,
  extractEphemeralTokenName,
} from "./token.ts";

test("live model ids are the researched pair, primary first", () => {
  assert.equal(LIVE_MODEL_PRIMARY, "gemini-3.8-live");
  assert.equal(LIVE_MODEL_FALLBACK, "gemini-3.1-flash-live-preview");
  assert.equal(LIVE_SESSION_CAP_MS, 15 * 60 * 1000);
  assert.equal(isLiveModelId("gemini-3.8-live"), true);
  assert.equal(isLiveModelId("gemini-2.5-flash"), false);
  assert.equal(isLiveModelId(undefined), false);
});

test("buildLiveTokenConfig mints a single-use, audio-only, model-locked token", () => {
  const now = 1_700_000_000_000;
  const { params, expiresAt, newSessionExpiresAt } = buildLiveTokenConfig(
    LIVE_MODEL_PRIMARY,
    now
  );
  const config = params.config;
  assert.ok(config);
  assert.equal(config?.uses, 1);
  assert.equal(expiresAt, now + LIVE_SESSION_CAP_MS);
  assert.equal(newSessionExpiresAt, now + 60_000);
  assert.equal(config?.expireTime, new Date(expiresAt).toISOString());
  assert.equal(
    config?.liveConnectConstraints?.model,
    LIVE_MODEL_PRIMARY
  );
  assert.deepEqual(
    config?.liveConnectConstraints?.config?.responseModalities,
    ["AUDIO"]
  );
  assert.equal(
    typeof config?.liveConnectConstraints?.config?.systemInstruction,
    "string"
  );
  assert.deepEqual(config?.lockAdditionalFields, []);
});

test("extractEphemeralTokenName takes token.name, nothing else", () => {
  assert.equal(
    extractEphemeralTokenName({ name: "authTokens/abc123" }),
    "authTokens/abc123"
  );
  assert.equal(extractEphemeralTokenName({}), null);
  assert.equal(extractEphemeralTokenName({ name: "" }), null);
  assert.equal(extractEphemeralTokenName(null), null);
});

import test from "node:test";
import assert from "node:assert/strict";

import { classifyGeminiFailure } from "./fallback.ts";

function errorWithStatus(status: number, message: string): Error {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

test("a 404 model-not-found is model_unavailable and retryable", () => {
  const failure = classifyGeminiFailure(
    errorWithStatus(404, "models/gemini-4-hydrogen is not found for API version v1beta")
  );
  assert.equal(failure.category, "model_unavailable");
  assert.equal(failure.status, 404);
  assert.equal(failure.retryable, true);
});

test("unsupported-model messages are model_unavailable even without a status", () => {
  for (const message of [
    "Model 'gemini-4-hydrogen' not found",
    "Unsupported model: gemini-4-hydrogen",
    "The model gemini-4-hydrogen is not supported for this API version",
  ]) {
    const failure = classifyGeminiFailure(new Error(message));
    assert.equal(failure.category, "model_unavailable");
    assert.equal(failure.retryable, true);
  }
});

test("auth failures stay permanent and non-retryable", () => {
  for (const message of [
    "API key not valid. Please pass a valid API key.",
    "Request had invalid authentication credentials",
    "Permission denied: invalid API key",
  ]) {
    const failure = classifyGeminiFailure(new Error(message));
    assert.equal(failure.category, "permanent_error");
    assert.equal(failure.retryable, false);
  }
  const forbidden = classifyGeminiFailure(
    errorWithStatus(403, "Forbidden")
  );
  assert.equal(forbidden.category, "permanent_error");
  assert.equal(forbidden.retryable, false);
});

test("429 and 5xx stay retryable provider errors", () => {
  const quota = classifyGeminiFailure(
    errorWithStatus(429, "You exceeded your current quota")
  );
  assert.equal(quota.category, "provider_http_error");
  assert.equal(quota.retryable, true);

  const overloaded = classifyGeminiFailure(
    errorWithStatus(503, "The model is overloaded")
  );
  assert.equal(overloaded.category, "provider_http_error");
  assert.equal(overloaded.retryable, true);
});

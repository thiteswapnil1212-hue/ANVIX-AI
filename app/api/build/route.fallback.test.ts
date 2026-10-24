import test from "node:test";
import assert from "node:assert/strict";

import {
  generateProjectTextWithFallback,
  type GeminiModelFactory,
} from "../../../lib/gemini/fallback.ts";

test("surfaces the failure when the only configured model returns malformed JSON", async () => {
  const calls: string[] = [];

  const modelFactory = (apiKey: string, modelName: string) => {
    calls.push(modelName);
    return {
      generateContent: async () => {
        return {
          response: {
            text: async () => "```json\n{bad json}\n```",
          },
        };
      },
    } as unknown as ReturnType<GeminiModelFactory>;
  };

  // Single-model chain (the lite/2.0/3.8 fallbacks are dead on this API):
  // after both attempts fail, the error surfaces instead of falling back.
  await assert.rejects(
    () => generateProjectTextWithFallback("test-key", "Build a coffee shop", modelFactory),
    /all configured models/
  );
  assert.deepEqual(calls, ["gemini-2.5-flash"]);
});

test("surfaces the failure when the only configured model has a retryable provider error", async () => {
  const calls: string[] = [];

  const modelFactory = (apiKey: string, modelName: string) => {
    calls.push(modelName);
    return {
      generateContent: async () => {
        const error = new Error("Service unavailable") as Error & { status?: number };
        error.status = 503;
        throw error;
      },
    } as unknown as ReturnType<GeminiModelFactory>;
  };

  // Single-model chain: after both attempts fail, the error surfaces.
  await assert.rejects(
    () => generateProjectTextWithFallback("test-key", "Build a coffee shop", modelFactory),
    /all configured models/
  );
  assert.deepEqual(calls, ["gemini-2.5-flash"]);
});

test("throws if all models fail and preserves permanent-error classification", async () => {
  const calls: string[] = [];

  const modelFactory = (apiKey: string, modelName: string) => {
    calls.push(modelName);
    return {
      generateContent: async () => {
        const error = new Error("Invalid API key") as Error & { status?: number };
        error.status = 401;
        throw error;
      },
    } as unknown as ReturnType<GeminiModelFactory>;
  };

  await assert.rejects(
    () => generateProjectTextWithFallback("bad-key", "Build a coffee shop", modelFactory),
    /Invalid API key/
  );

  // A 401 is a permanent error: the same bad key would fail on every model,
  // so the fallback must stop after the first model instead of burning all three.
  assert.deepEqual(calls, ["gemini-2.5-flash"]);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  CHAT_MODES,
  DEFAULT_CHAT_MODE_ID,
  defaultThinkingForMode,
  getChatMode,
  parseChatMode,
  parseThinkingChoice,
  resolveChatMode,
  resolveLegacyChatModel,
  thinkingLevelForChoice,
} from "./chat-modes.ts";

test("chat modes map to the documented model chains and defaults", () => {
  assert.equal(DEFAULT_CHAT_MODE_ID, "smart");

  const fast = getChatMode("fast");
  assert.equal(fast?.modelId, "gemini-3.5-flash-lite");
  assert.equal(fast?.fallbackModelId, "gemini-3.8-flash");
  assert.equal(fast?.defaultThinking, "off");

  const smart = getChatMode("smart");
  assert.equal(smart?.modelId, "gemini-3.8-flash");
  assert.equal(smart?.fallbackModelId, "gemini-3.5-flash-lite");
  assert.equal(smart?.defaultThinking, "fast");

  const deep = getChatMode("deep");
  assert.equal(deep?.modelId, "gemini-4-hydrogen");
  assert.equal(deep?.fallbackModelId, "gemini-3.8-flash");
  assert.equal(deep?.defaultThinking, "deep");

  // Every mode's primary differs from its fallback, so a retry
  // actually changes model.
  for (const mode of CHAT_MODES) {
    assert.notEqual(mode.modelId, mode.fallbackModelId);
  }
});

test("unknown modes fall back to Smart, never throw", () => {
  assert.equal(parseChatMode("gpt-4o"), "smart");
  assert.equal(parseChatMode(""), "smart");
  assert.equal(parseChatMode(undefined), "smart");
  assert.equal(parseChatMode(null), "smart");
  assert.equal(parseChatMode(42), "smart");
  assert.equal(parseChatMode("FAST"), "smart");
  assert.equal(getChatMode("nope"), undefined);
});

test("thinking choices map to Gemini 3 thinking levels", () => {
  // Gemini 3 has no true off: Off is minimal + no thought summaries.
  assert.deepEqual(thinkingLevelForChoice("off"), {
    level: "minimal",
    includeThoughts: false,
  });
  assert.deepEqual(thinkingLevelForChoice("fast"), {
    level: "low",
    includeThoughts: true,
  });
  assert.deepEqual(thinkingLevelForChoice("deep"), {
    level: "high",
    includeThoughts: true,
  });

  assert.equal(parseThinkingChoice("off"), "off");
  assert.equal(parseThinkingChoice("fast"), "fast");
  assert.equal(parseThinkingChoice("deep"), "deep");
  assert.equal(parseThinkingChoice("medium"), undefined);
  assert.equal(parseThinkingChoice(undefined), undefined);
  assert.equal(defaultThinkingForMode("fast"), "off");
  assert.equal(defaultThinkingForMode("smart"), "fast");
  assert.equal(defaultThinkingForMode("deep"), "deep");
});

test("resolveChatMode uses the mode default when thinking is absent", () => {
  const resolved = resolveChatMode("deep", undefined);
  assert.equal(resolved.mode.id, "deep");
  assert.equal(resolved.modelId, "gemini-4-hydrogen");
  assert.equal(resolved.fallbackModelId, "gemini-3.8-flash");
  assert.equal(resolved.thinking, "deep");
  assert.equal(resolved.thinkingLevel, "high");
  assert.equal(resolved.includeThoughts, true);

  const fast = resolveChatMode("fast", undefined);
  assert.equal(fast.thinking, "off");
  assert.equal(fast.thinkingLevel, "minimal");
  assert.equal(fast.includeThoughts, false);
});

test("resolveChatMode lets the thinking toggle override the mode default", () => {
  const resolved = resolveChatMode("fast", "deep");
  assert.equal(resolved.mode.id, "fast");
  assert.equal(resolved.thinking, "deep");
  assert.equal(resolved.thinkingLevel, "high");
  assert.equal(resolved.includeThoughts, true);

  // Invalid mode + invalid thinking both fall back, never throw.
  const fallback = resolveChatMode("unknown", "unknown");
  assert.equal(fallback.mode.id, "smart");
  assert.equal(fallback.thinking, "fast");
});

test("legacy model ids translate to the equivalent mode + thinking", () => {
  assert.deepEqual(
    resolveLegacyChatModel("gemini-3.5-flash-lite"),
    { modeId: "fast", thinking: "fast" }
  );
  assert.equal(resolveLegacyChatModel("gemini-3.8-flash"), null);
  assert.equal(resolveLegacyChatModel("gpt-4o"), null);
  assert.equal(resolveLegacyChatModel(undefined), null);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTtsRequestBody,
  isGeminiTtsFree,
  parseTtsAudio,
  stripMarkdownForSpeech,
  TTS_MAX_CHARS,
  TTS_MODEL_ID,
  validateTtsText,
} from "./tts.ts";

test("isGeminiTtsFree ends at 31 Dec 2026", () => {
  assert.equal(isGeminiTtsFree(Date.parse("2026-12-31T12:00:00Z")), true);
  assert.equal(isGeminiTtsFree(Date.parse("2026-12-31T23:59:59Z")), true);
  // 1 Jan 2027: the paid era — the route must refuse to call Gemini.
  assert.equal(isGeminiTtsFree(Date.parse("2027-01-01T00:00:00Z")), false);
  assert.equal(isGeminiTtsFree(Date.parse("2027-06-01T00:00:00Z")), false);
});

test("stripMarkdownForSpeech drops code, keeps readable text", () => {
  const input = [
    "# Title",
    "",
    "Use `npm install` then see [the docs](https://example.com).",
    "",
    "```js",
    "const x = 1;",
    "```",
    "",
    "- one **bold** item",
    "> a quote",
  ].join("\n");

  assert.equal(
    stripMarkdownForSpeech(input),
    "Title Use npm install then see the docs. one bold item a quote"
  );
});

test("validateTtsText truncates long replies instead of rejecting", () => {
  assert.deepEqual(validateTtsText("  "), {
    ok: false,
    error: "Nothing to read aloud.",
  });
  assert.deepEqual(validateTtsText("Hello there"), {
    ok: true,
    text: "Hello there",
    truncated: false,
  });

  const long = validateTtsText("a".repeat(TTS_MAX_CHARS + 500));
  assert.equal(long.ok, true);
  if (long.ok) {
    assert.equal(long.text.length, TTS_MAX_CHARS);
    assert.equal(long.truncated, true);
  }
});

test("buildTtsRequestBody asks for audio with the TTS model voice", () => {
  const body = buildTtsRequestBody("hello");
  assert.deepEqual(body, {
    contents: [{ parts: [{ text: "hello" }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Kore" },
        },
      },
    },
  });
  assert.equal(TTS_MODEL_ID, "gemini-3.8-flash-tts");
});

test("parseTtsAudio extracts inline audio, null when absent", () => {
  const body = {
    candidates: [
      {
        content: {
          parts: [
            { text: "ignored" },
            {
              inlineData: {
                mimeType: "audio/wav",
                data: "UklGRg==",
              },
            },
          ],
        },
      },
    ],
  };
  assert.deepEqual(parseTtsAudio(body), {
    data: "UklGRg==",
    mimeType: "audio/wav",
  });
  assert.equal(parseTtsAudio({ candidates: [] }), null);
  assert.equal(parseTtsAudio({}), null);
  assert.equal(parseTtsAudio(null), null);
});

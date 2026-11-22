/**
 * Gemini TTS read-aloud — free NOW, hard expiry 1 Jan 2027 (TIME BOMB).
 *
 * The model is `gemini-3.8-flash-tts` (old 2.5/3.1 TTS models shut
 * down 18 Dec 2026). It is free of charge through 31 Dec 2026, then
 * paid (~$1/$18 per 1M tokens from 1 Jan 2027). The route therefore
 * refuses to call Gemini on/after 1 Jan 2027 (HTTP 410) and the
 * client falls back to the browser's Web Speech `speechSynthesis`
 * (free forever, lower quality) — the fallback is built the same day
 * as the feature, so this never silently starts costing money and
 * never breaks outright. No per-model RPM/RPD is published; the
 * per-user cap (5 read-alouds/day) is the guard.
 *
 * 1 second of audio = 25 tokens. Long replies are truncated to
 * MAX_TTS_CHARS so one read-aloud cannot eat the day's allowance.
 */

export const TTS_MODEL_ID = "gemini-3.8-flash-tts";
export const TTS_VOICE = "Kore";
export const TTS_MAX_CHARS = 1500;
/** Last instant Gemini TTS is free (end of 31 Dec 2026, UTC). */
export const TTS_FREE_UNTIL_MS = Date.parse("2026-12-31T23:59:59.999Z");

/** Is Gemini TTS still inside its free window? */
export function isGeminiTtsFree(nowMs: number = Date.now()): boolean {
  return nowMs <= TTS_FREE_UNTIL_MS;
}

/**
 * Strip Markdown/code down to speakable plain text: fenced code
 * blocks are dropped (reading code aloud is noise), links keep their
 * label, headings/bold/italic markers are removed.
 */
export function stripMarkdownForSpeech(text: string): string {
  return (
    text
      // Fenced code blocks (```...```) — drop entirely.
      .replace(/```[\s\S]*?```/g, " ")
      // Inline code keeps its text, loses the backticks.
      .replace(/`([^`]+)`/g, "$1")
      // Images: keep the alt text.
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Links: keep the label.
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Headings, quotes, list markers, rules, emphasis.
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/^[-*+]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
      // Any HTML tags.
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export type TtsTextValidation =
  | { ok: true; text: string; truncated: boolean }
  | { ok: false; error: string };

/** Validate + clean reply text for speech; truncate, never reject. */
export function validateTtsText(value: unknown): TtsTextValidation {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: "Nothing to read aloud." };
  }
  const cleaned = stripMarkdownForSpeech(value);
  if (!cleaned) {
    return { ok: false, error: "Nothing to read aloud." };
  }
  if (cleaned.length > TTS_MAX_CHARS) {
    return {
      ok: true,
      text: cleaned.slice(0, TTS_MAX_CHARS),
      truncated: true,
    };
  }
  return { ok: true, text: cleaned, truncated: false };
}

/**
 * Wrap raw 16-bit mono PCM in a WAV header (24 kHz, Gemini TTS).
 * Gemini TTS sometimes returns raw PCM (`audio/L16...`) instead of
 * WAV — the client wraps it so the browser can play it.
 */
export function pcmToWav(pcm: Uint8Array, sampleRate = 24_000): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, pcm.length, true);

  const wav = new Uint8Array(44 + pcm.length);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcm, 44);
  return wav;
}

/** REST body for `models/<tts-model>:generateContent`. */
export function buildTtsRequestBody(text: string): Record<string, unknown> {
  return {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: TTS_VOICE },
        },
      },
    },
  };
}

export type TtsAudio = { data: string; mimeType: string };

/**
 * Pull the base64 audio out of a Gemini generateContent response.
 * Returns null when the response has no audio part (wrong model,
 * safety block, malformed body) — the route then falls back to
 * Web Speech instead of crashing.
 */
export function parseTtsAudio(body: unknown): TtsAudio | null {
  if (!body || typeof body !== "object") return null;
  const candidates = (body as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const first = candidates[0];
  if (!first || typeof first !== "object") return null;
  const content = (first as Record<string, unknown>).content;
  if (!content || typeof content !== "object") return null;
  const parts = (content as Record<string, unknown>).parts;
  if (!Array.isArray(parts)) return null;

  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    const inlineData = (part as Record<string, unknown>).inlineData;
    if (!inlineData || typeof inlineData !== "object") continue;
    const data = (inlineData as Record<string, unknown>).data;
    const mimeType = (inlineData as Record<string, unknown>).mimeType;
    if (typeof data === "string" && data) {
      return {
        data,
        mimeType: typeof mimeType === "string" ? mimeType : "audio/wav",
      };
    }
  }
  return null;
}

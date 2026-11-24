import { getAuthHeaders } from "./api/auth-headers.ts";
import { pcmToWav, stripMarkdownForSpeech } from "./tts.ts";

/**
 * Client-side read-aloud: Gemini TTS first, browser Web Speech
 * (`speechSynthesis`) as the automatic fallback.
 *
 * The fallback is the point: Gemini TTS is free only through
 * 31 Dec 2026, and the /api/tts route answers 410/503 with
 * `fallback: "web-speech"` whenever Gemini voice is gone, unconfigured
 * or erroring. This helper honours that contract — the Listen button
 * never goes dead and never waits on a paid voice.
 *
 * Gemini TTS sometimes returns raw 24 kHz mono PCM (mimeType
 * `audio/L16...`) instead of WAV; `pcmToWav` wraps it so the browser
 * can play it. WAV responses play as-is.
 */

export type ReadAloudSource = "gemini" | "browser";

export type ReadAloudHandle = {
  source: ReadAloudSource;
  /** Stop playback and release resources. Safe to call twice. */
  stop: () => void;
};

type TtsApiResponse = {
  audio?: { data: string; mimeType: string };
  error?: string;
  fallback?: string | null;
};

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function audioBlobFor(data: string, mimeType: string): Blob {
  const bytes = base64ToBytes(data);
  if (/wav/i.test(mimeType)) {
    return new Blob([bytes as BlobPart], { type: "audio/wav" });
  }
  // Raw PCM (audio/L16) — wrap it so <audio> can play it.
  return new Blob([pcmToWav(bytes) as BlobPart], { type: "audio/wav" });
}

/**
 * Voices load asynchronously in Chrome: getVoices() often returns
 * [] on the first call and fills in later via `voiceschanged`.
 * Speaking before any voice exists silently does nothing — the
 * utterance ends immediately with no audio, which looked like a
 * broken Listen button. Wait briefly for voices; an empty list after
 * the wait means this browser genuinely cannot speak.
 */
function waitForVoices(timeoutMs: number): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const current = synth.getVoices();
  if (current.length > 0) return Promise.resolve(current);

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener("voiceschanged", finish);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", finish);
    setTimeout(finish, timeoutMs);
  });
}

/**
 * Read `text` aloud with the browser's built-in voice. Free forever.
 * Picks an English voice when one is available; falls back to the
 * browser default otherwise. Resolves `onEnd` when speech finishes
 * or is stopped. Throws when no voice exists at all, so the caller
 * can show "Voice unavailable" instead of silently playing nothing.
 */
export async function speakWithBrowserVoice(
  text: string,
  onEnd: () => void
): Promise<() => void> {
  const synth = window.speechSynthesis;
  if (!synth || typeof synth.speak !== "function") {
    throw new Error("Browser speech is unavailable");
  }

  const clean = stripMarkdownForSpeech(text);
  if (!clean) {
    onEnd();
    return () => {};
  }

  const voices = await waitForVoices(1500);
  if (voices.length === 0) {
    throw new Error("No browser voices available");
  }

  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  const english =
    voices.find((voice) => /^en[-_]IN/i.test(voice.lang)) ??
    voices.find((voice) => /^en[-_]/i.test(voice.lang));
  if (english) utterance.voice = english;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  synth.speak(utterance);

  return () => {
    utterance.onend = null;
    utterance.onerror = null;
    synth.cancel();
    onEnd();
  };
}

/**
 * Start reading `text` aloud. Tries Gemini TTS via /api/tts first;
 * on any fallback signal (410/503/429 or a network failure) it uses
 * the browser voice automatically and reports `source: "browser"`.
 * The caller shows a small note when the source is the browser voice.
 */
export async function startReadAloud(
  text: string,
  onEnd: () => void
): Promise<ReadAloudHandle> {
  let response: Response | null = null;
  // The Gemini call can hang; without a timeout the button sits on
  // "Loading voice…" indefinitely instead of falling back.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
  } catch {
    // Network failure or timeout: browser voice, no error shown.
    response = null;
  } finally {
    clearTimeout(timeout);
  }

  if (response?.ok) {
    try {
      const data = (await response.json()) as TtsApiResponse;
      if (data.audio?.data) {
        const blob = audioBlobFor(data.audio.data, data.audio.mimeType);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        let ended = false;
        const finish = () => {
          if (ended) return;
          ended = true;
          URL.revokeObjectURL(url);
          onEnd();
        };
        audio.onended = finish;
        audio.onerror = finish;
        await audio.play();
        return {
          source: "gemini",
          stop: () => {
            audio.pause();
            finish();
          },
        };
      }
    } catch {
      // Unplayable Gemini audio: fall through to the browser voice.
    }
  }

  // The browser fallback throws when no voice exists at all — let
  // that reach the caller (Listen shows "Voice unavailable") instead
  // of resolving a handle that plays nothing.
  const stopBrowser = await speakWithBrowserVoice(text, onEnd);
  return { source: "browser", stop: stopBrowser };
}

/** Is browser speech available in this browser at all? */
export function isBrowserSpeechAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.speechSynthesis?.speak === "function"
  );
}

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
 * Read `text` aloud with the browser's built-in voice. Free forever.
 * Picks an English voice when one is available; falls back to the
 * browser default otherwise. Resolves `onEnd` when speech finishes
 * or is stopped.
 */
export function speakWithBrowserVoice(
  text: string,
  onEnd: () => void
): () => void {
  const synth = window.speechSynthesis;
  const clean = stripMarkdownForSpeech(text);
  if (!clean) {
    onEnd();
    return () => {};
  }

  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  const voices = synth.getVoices();
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
  try {
    response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Network failure: browser voice, no error shown.
    response = null;
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

  const stopBrowser = speakWithBrowserVoice(text, onEnd);
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

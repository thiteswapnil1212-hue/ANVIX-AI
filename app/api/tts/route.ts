import { enforceRateLimit } from "@/lib/rate-limit";
import { enforceDailyCap, TTS_DAILY_CAP } from "@/lib/daily-cap";
import {
  buildTtsRequestBody,
  isGeminiTtsFree,
  parseTtsAudio,
  TTS_MODEL_ID,
  TTS_VOICE,
  validateTtsText,
} from "@/lib/tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_GENERATE_URL =
  "https://generativelanguage.googleapis.com/v1beta";
const TTS_FETCH_TIMEOUT_MS = 30_000;

/**
 * Read-aloud: returns Gemini TTS audio (base64) for a reply, or tells
 * the client to use the browser voice instead.
 *
 * The `fallback: "web-speech"` contract — the client MUST honour it:
 * - 410: the Gemini TTS free window ended 31 Dec 2026. The route
 *   will not call a now-paid model; the browser voice takes over.
 * - 503: no server Gemini key, or Gemini returned no audio — the
 *   browser voice takes over.
 * - 429: daily cap (5/day) hit — the browser voice is still free and
 *   unlimited, so the client may still offer it with a note.
 *
 * Never let this route silently start costing money: the date gate
 * runs before any Gemini call, and there is no paid fallback path.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "tts", 10, 60_000);
  if (limited) return limited;
  const capped = await enforceDailyCap(request, "tts", TTS_DAILY_CAP);
  if (capped) {
    const body = (await capped.json()) as Record<string, unknown>;
    return Response.json(
      { ...body, fallback: "web-speech" },
      { status: 429 }
    );
  }

  let parsed: { text?: unknown };
  try {
    parsed = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validateTtsText(parsed.text);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  if (!isGeminiTtsFree()) {
    return Response.json(
      {
        error:
          "Gemini's free voice ended on 31 Dec 2026. Using your browser's built-in voice instead.",
        fallback: "web-speech",
      },
      { status: 410 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Gemini voice is not configured. Using your browser's built-in voice instead.",
        fallback: "web-speech",
      },
      { status: 503 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${GEMINI_GENERATE_URL}/models/${TTS_MODEL_ID}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(buildTtsRequestBody(validated.text)),
        signal: AbortSignal.timeout(TTS_FETCH_TIMEOUT_MS),
      }
    );
  } catch (error) {
    console.error("Gemini TTS fetch failed:", error);
    return Response.json(
      {
        error:
          "Gemini voice is unavailable right now. Using your browser's built-in voice instead.",
        fallback: "web-speech",
      },
      { status: 503 }
    );
  }

  if (!upstream.ok) {
    console.error("Gemini TTS error status:", upstream.status);
    return Response.json(
      {
        error:
          "Gemini voice is unavailable right now. Using your browser's built-in voice instead.",
        fallback: "web-speech",
      },
      { status: 503 }
    );
  }

  const audio = parseTtsAudio(await upstream.json().catch(() => null));
  if (!audio) {
    return Response.json(
      {
        error:
          "Gemini voice returned no audio. Using your browser's built-in voice instead.",
        fallback: "web-speech",
      },
      { status: 503 }
    );
  }

  return Response.json({
    audio,
    voice: TTS_VOICE,
    model: TTS_MODEL_ID,
    truncated: validated.truncated,
    fallback: null,
  });
}

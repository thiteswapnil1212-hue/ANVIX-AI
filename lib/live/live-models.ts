/**
 * Gemini Live (experimental) — model + session constants.
 *
 * Primary model `gemini-3.8-live` is the model named in the research
 * report (§6); `gemini-3.1-flash-live-preview` is the documented
 * fallback if 3.8-live is unavailable for the app's key. Neither model
 * id was verified live against Google (no live Gemini calls are made in
 * this repo's verification) — the client tries the primary first and
 * falls back automatically, and reports the failure honestly if both
 * fail.
 *
 * Session limits (from the report §6 / Google docs): audio-only
 * sessions end after 15 minutes; each WebSocket connection lasts ~10
 * minutes; the ephemeral token below is minted for a single use and a
 * 60-second window to start the session.
 */

export const LIVE_MODEL_PRIMARY = "gemini-3.8-live";
export const LIVE_MODEL_FALLBACK = "gemini-3.1-flash-live-preview";

export const LIVE_MODELS = [LIVE_MODEL_PRIMARY, LIVE_MODEL_FALLBACK] as const;
export type LiveModelId = (typeof LIVE_MODELS)[number];

/** Audio sessions end after 15 minutes (Google's limit). */
export const LIVE_SESSION_CAP_MS = 15 * 60 * 1000;
export const LIVE_SESSION_CAP_SECONDS = 15 * 60;

export const LIVE_SYSTEM_INSTRUCTION =
  "You are ANVIX, a helpful voice assistant. Keep answers short and spoken — one or two sentences unless the user asks for detail. If you do not know something, say so.";

export function isLiveModelId(value: unknown): value is LiveModelId {
  return (
    typeof value === "string" &&
    (LIVE_MODELS as readonly string[]).includes(value)
  );
}

import {
  Modality,
  type CreateAuthTokenParameters,
  type LiveConnectConstraints,
} from "@google/genai";
import {
  LIVE_MODEL_PRIMARY,
  LIVE_SESSION_CAP_MS,
  LIVE_SYSTEM_INSTRUCTION,
  type LiveModelId,
} from "./live-models.ts";

/**
 * Ephemeral-token minting for Gemini Live (server side only).
 *
 * The token's usable value is `token.name` (e.g. `authTokens/abc123…`);
 * the client passes it to `new GoogleGenAI({ apiKey: token.name })` as
 * if it were an API key. The app's real `GEMINI_API_KEY` never leaves
 * the server.
 *
 * The token is constrained to one Live model + audio-only responses and
 * a single use, with 60 seconds to start the session and 15 minutes to
 * send messages over it (the audio-session cap). `lockAdditionalFields:
 * []` locks the constrained fields, so a client cannot widen the token
 * into a different model or enable tools/code execution.
 */

export interface LiveTokenConfig {
  params: CreateAuthTokenParameters;
  /** Epoch ms when the token stops accepting new sessions. */
  newSessionExpiresAt: number;
  /** Epoch ms when messages over the session are rejected. */
  expiresAt: number;
}

/** Pure config builder — unit-tested without touching Google. */
export function buildLiveTokenConfig(
  model: LiveModelId,
  nowMs: number = Date.now()
): LiveTokenConfig {
  const expiresAt = nowMs + LIVE_SESSION_CAP_MS;
  const newSessionExpiresAt = nowMs + 60 * 1000;
  const constraints: LiveConnectConstraints = {
    model,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: LIVE_SYSTEM_INSTRUCTION,
    },
  };
  return {
    params: {
      config: {
        uses: 1,
        expireTime: new Date(expiresAt).toISOString(),
        newSessionExpireTime: new Date(newSessionExpiresAt).toISOString(),
        liveConnectConstraints: constraints,
        lockAdditionalFields: [],
      },
    },
    newSessionExpiresAt,
    expiresAt,
  };
}

/** The client-usable token value is `token.name`; null when absent. */
export function extractEphemeralTokenName(
  token: { name?: unknown } | null | undefined
): string | null {
  if (!token || typeof token.name !== "string" || !token.name) return null;
  return token.name;
}

export { LIVE_MODEL_PRIMARY };

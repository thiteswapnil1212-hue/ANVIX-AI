import { createHmac } from "node:crypto";
import { getEncryptionKey, safeEqual } from "./crypto.ts";
import type { GoogleTokens } from "./oauth.ts";

/**
 * One-time setup cookie for the Google OAuth callback.
 *
 * The callback is a plain browser redirect from Google — it carries no
 * Bearer token, so it cannot write the `google_connections` row through
 * RLS as the user. Two paths:
 * 1. If `SUPABASE_SERVICE_ROLE_KEY` is set, the callback writes directly
 *    (user id from the HMAC-signed `state`) and this cookie is unused.
 * 2. Otherwise the callback encrypts the fresh tokens into this cookie
 *    (httpOnly, 10-minute expiry, HMAC-signed) and redirects to
 *    `/calendar?google_setup=1`; the page then calls
 *    `POST /api/integrations/google/complete`, which verifies the cookie,
 *    checks the cookie's user id against the caller's Bearer token, and
 *    writes the row through RLS as that user.
 *
 * The tokens inside the cookie are already AES-256-GCM encrypted by
 * `saveGoogleConnection`'s helpers, so the cookie never holds a plaintext
 * token even if it were somehow read.
 */

export const GOOGLE_SETUP_COOKIE = "anvix_google_setup";
export const SETUP_TTL_MS = 10 * 60 * 1000;

export interface SetupPayload {
  userId: string;
  encryptedRefreshToken: string;
  encryptedAccessToken: string | null;
  accessTokenExpiresAt: number;
  scope: string;
  exp: number;
}

export function signSetupPayload(
  payload: Omit<SetupPayload, "exp">,
  key: Buffer | null = getEncryptionKey(),
  nowMs: number = Date.now()
): string | null {
  if (!key) return null;
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: nowMs + SETUP_TTL_MS }),
    "utf8"
  ).toString("base64url");
  const sig = createHmac("sha256", key).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function verifySetupPayload(
  value: string,
  key: Buffer | null = getEncryptionKey(),
  nowMs: number = Date.now()
): SetupPayload | null {
  if (!key || !value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", key).update(body).digest("hex");
  if (!safeEqual(sig, expected)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SetupPayload;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.encryptedRefreshToken !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= nowMs
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Build the encrypted setup payload for freshly-exchanged tokens. */
export function setupPayloadFromTokens(
  userId: string,
  tokens: GoogleTokens,
  encrypt: (plaintext: string) => string
): Omit<SetupPayload, "exp"> | null {
  if (!tokens.refreshToken) return null;
  let encryptedRefresh: string;
  let encryptedAccess: string | null = null;
  try {
    encryptedRefresh = encrypt(tokens.refreshToken);
    if (tokens.accessToken) encryptedAccess = encrypt(tokens.accessToken);
  } catch {
    return null;
  }
  return {
    userId,
    encryptedRefreshToken: encryptedRefresh,
    encryptedAccessToken: encryptedAccess,
    accessTokenExpiresAt: tokens.expiresAt,
    scope: tokens.scope,
  };
}

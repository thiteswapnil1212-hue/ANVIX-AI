import { createHmac, randomBytes } from "node:crypto";
import { getEncryptionKey, safeEqual } from "./crypto.ts";

/**
 * Google OAuth 2.0 for ANVIX integrations.
 *
 * Scopes (sensitive, NOT restricted — free OAuth verification, 3–6 weeks;
 * waived for personal-use / dev testing):
 * - `calendar.readonly` — read the user's events
 * - `calendar.events`   — create / edit / delete events
 *
 * Deliberately NOT requested: any Gmail scope. `gmail.readonly`,
 * `gmail.modify`, `gmail.compose` and `gmail.metadata` are RESTRICTED and
 * need a $500–$4,500/yr CASA assessment — Gmail read is never built.
 * `gmail.send` (sensitive, shippable) is an optional future stretch and
 * is not requested here either.
 *
 * Client ID / secret come from env only (`GOOGLE_OAUTH_CLIENT_ID`,
 * `GOOGLE_OAUTH_CLIENT_SECRET`) and are never hard-coded or sent to the
 * browser. The `state` parameter is HMAC-signed with the same key as the
 * token encryption, so the callback can verify it statelessly (no
 * server-side session store, which would not survive Vercel recycling).
 */

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
] as const;

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
}

/** Env config, or null when Google OAuth is not configured on this deploy. */
export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** True when the deployment can offer Google Calendar at all. */
export function isGoogleOAuthConfigured(): boolean {
  return getGoogleOAuthConfig() !== null;
}

export function buildGoogleAuthUrl(
  config: GoogleOAuthConfig,
  redirectUri: string,
  state: string
): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES.join(" "));
  // offline access = refresh token; prompt=consent re-issues one even if
  // the user connected before (Google only returns a refresh token on the
  // first consent otherwise).
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  url.searchParams.set("include_granted_scopes", "true");
  return url.toString();
}

function base64url(data: Buffer | string): string {
  return Buffer.from(data).toString("base64url");
}

/**
 * Sign an OAuth state payload `{ userId, nonce, exp }`. `key` is a test
 * seam — routes omit it and use the env encryption key. Throws when no
 * key is configured (state cannot be verified without one).
 */
export function signOAuthState(
  userId: string,
  key: Buffer | null = getEncryptionKey(),
  nowMs: number = Date.now()
): string {
  if (!key) {
    throw new Error(
      "OAuth state cannot be signed: set GOOGLE_TOKEN_ENCRYPTION_KEY."
    );
  }
  const payload = base64url(
    JSON.stringify({
      userId,
      nonce: randomBytes(16).toString("hex"),
      exp: nowMs + OAUTH_STATE_TTL_MS,
    })
  );
  const sig = createHmac("sha256", key).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/** Verify a state value; returns the user id or null when invalid/expired. */
export function verifyOAuthState(
  state: string,
  key: Buffer | null = getEncryptionKey(),
  nowMs: number = Date.now()
): string | null {
  if (!key || !state) return null;
  const dot = state.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = createHmac("sha256", key).update(payload).digest("hex");
  if (!safeEqual(sig, expected)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { userId?: unknown; exp?: unknown };
    if (typeof parsed.userId !== "string" || !parsed.userId) return null;
    if (typeof parsed.exp !== "number" || parsed.exp <= nowMs) return null;
    return parsed.userId;
  } catch {
    return null;
  }
}

export interface GoogleTokens {
  accessToken: string;
  /** May be absent when Google does not re-issue one (keep the old one). */
  refreshToken: string | null;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
  scope: string;
}

interface TokenEndpointResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  scope?: unknown;
  token_type?: unknown;
  error?: unknown;
  error_description?: unknown;
}

function parseTokenResponse(
  json: TokenEndpointResponse,
  nowMs: number
): GoogleTokens | null {
  if (typeof json.access_token !== "string" || !json.access_token) {
    return null;
  }
  const expiresIn =
    typeof json.expires_in === "number" ? json.expires_in : 3600;
  return {
    accessToken: json.access_token,
    refreshToken:
      typeof json.refresh_token === "string" ? json.refresh_token : null,
    expiresAt: nowMs + expiresIn * 1000,
    scope: typeof json.scope === "string" ? json.scope : "",
  };
}

type FetchFn = typeof fetch;

/** Exchange an authorization code for tokens. Returns null on any failure. */
export async function exchangeAuthCode(
  config: GoogleOAuthConfig,
  code: string,
  redirectUri: string,
  fetchFn: FetchFn = fetch,
  nowMs: number = Date.now()
): Promise<GoogleTokens | null> {
  let response: Response;
  try {
    response = await fetchFn(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  let json: TokenEndpointResponse;
  try {
    json = (await response.json()) as TokenEndpointResponse;
  } catch {
    return null;
  }
  return parseTokenResponse(json, nowMs);
}

/** Refresh an access token. Returns null on any failure. */
export async function refreshAccessToken(
  config: GoogleOAuthConfig,
  refreshToken: string,
  fetchFn: FetchFn = fetch,
  nowMs: number = Date.now()
): Promise<GoogleTokens | null> {
  let response: Response;
  try {
    response = await fetchFn(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "refresh_token",
      }).toString(),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  let json: TokenEndpointResponse;
  try {
    json = (await response.json()) as TokenEndpointResponse;
  } catch {
    return null;
  }
  const tokens = parseTokenResponse(json, nowMs);
  // A refresh never returns a new refresh token; the caller keeps the old one.
  if (tokens) tokens.refreshToken = refreshToken;
  return tokens;
}

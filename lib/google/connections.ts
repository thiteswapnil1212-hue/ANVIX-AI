import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken, encryptToken } from "./crypto.ts";
import {
  refreshAccessToken,
  type GoogleOAuthConfig,
  type GoogleTokens,
} from "./oauth.ts";

/**
 * Google Calendar connection storage (Supabase `google_connections`).
 *
 * Tokens are AES-256-GCM encrypted before they reach the table and
 * decrypted only inside server routes. A row whose tokens cannot be
 * decrypted (wrong/rotated encryption key, corrupt data) is treated as
 * "not connected" — the user reconnects, the route never crashes.
 *
 * All functions tolerate a missing table (e.g. the SQL in
 * `supabase/schema.sql` was never run): they return null / false and the
 * routes answer with an honest "not set up yet" message instead of a 500.
 */

export interface StoredGoogleConnection {
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  scope: string;
}

interface ConnectionRow {
  encrypted_refresh_token: string | null;
  encrypted_access_token: string | null;
  access_token_expires_at: string | null;
  scope: string | null;
}

const TABLE = "google_connections";

/** Persist (insert or replace) a user's Google tokens, encrypted. */
export async function saveGoogleConnection(
  client: SupabaseClient,
  userId: string,
  tokens: GoogleTokens
): Promise<boolean> {
  if (!tokens.refreshToken) return false;
  let encryptedRefresh: string;
  let encryptedAccess: string | null = null;
  try {
    encryptedRefresh = encryptToken(tokens.refreshToken);
    if (tokens.accessToken) {
      encryptedAccess = encryptToken(tokens.accessToken);
    }
  } catch {
    // Encryption key not configured — refuse to store plaintext.
    return false;
  }

  const { error } = await client.from(TABLE).upsert({
    user_id: userId,
    provider: "google",
    encrypted_refresh_token: encryptedRefresh,
    encrypted_access_token: encryptedAccess,
    access_token_expires_at: new Date(tokens.expiresAt).toISOString(),
    scope: tokens.scope,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

/** Load and decrypt a user's connection, or null when not connected. */
export async function loadGoogleConnection(
  client: SupabaseClient,
  userId: string
): Promise<StoredGoogleConnection | null> {
  const { data, error } = await client
    .from(TABLE)
    .select(
      "encrypted_refresh_token, encrypted_access_token, access_token_expires_at, scope"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as ConnectionRow;
  if (!row.encrypted_refresh_token) return null;

  let refreshToken: string | null;
  let accessToken: string | null = null;
  try {
    refreshToken = decryptToken(row.encrypted_refresh_token);
    if (row.encrypted_access_token) {
      accessToken = decryptToken(row.encrypted_access_token);
    }
  } catch {
    return null;
  }
  if (!refreshToken) return null;

  return {
    refreshToken,
    accessToken,
    accessTokenExpiresAt: row.access_token_expires_at
      ? new Date(row.access_token_expires_at).getTime()
      : null,
    scope: row.scope ?? "",
  };
}

/** Delete a user's Google connection (disconnect). */
export async function deleteGoogleConnection(
  client: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { error } = await client.from(TABLE).delete().eq("user_id", userId);
  return !error;
}

const REFRESH_SKEW_MS = 60 * 1000; // refresh 60s before expiry

/**
 * A usable access token for this user: the stored one while it is fresh,
 * otherwise a refresh (persisted back, encrypted). Returns null when the
 * user never connected, the refresh fails (e.g. revoked in Google), or
 * storage is unavailable. A failed refresh also deletes the stale row so
 * the UI stops claiming the user is connected.
 */
export async function getValidAccessToken(
  client: SupabaseClient,
  userId: string,
  config: GoogleOAuthConfig,
  fetchFn: typeof fetch = fetch,
  nowMs: number = Date.now()
): Promise<string | null> {
  const connection = await loadGoogleConnection(client, userId);
  if (!connection) return null;

  if (
    connection.accessToken &&
    connection.accessTokenExpiresAt !== null &&
    connection.accessTokenExpiresAt - REFRESH_SKEW_MS > nowMs
  ) {
    return connection.accessToken;
  }

  const refreshed = await refreshAccessToken(
    config,
    connection.refreshToken,
    fetchFn,
    nowMs
  );
  if (!refreshed) {
    // Refresh token is dead (revoked / expired) — drop the stale row.
    await deleteGoogleConnection(client, userId);
    return null;
  }

  await saveGoogleConnection(client, userId, refreshed);
  return refreshed.accessToken;
}

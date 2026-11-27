import type { SupabaseClient } from "@supabase/supabase-js";

import {
  decryptApiKey,
  getByokEncryptionSecret,
  keyLast4,
} from "./crypto.ts";
import {
  createAuthedServerClient,
  getBearerToken,
  verifyAccessToken,
} from "../supabase/server.ts";

/**
 * BYOK key resolution — which Gemini key a chat/agent call runs on.
 *
 * Priority, in order:
 *   1. The caller's own key, when the request asked for it (`useOwnKey`)
 *      AND a stored key exists AND it decrypts. (A stored key that no
 *      longer decrypts — e.g. BYOK_ENCRYPTION_KEY was rotated — is
 *      treated as absent, never as an error the user must debug.)
 *   2. The shared server key (`GEMINI_API_KEY`).
 *   3. Nothing (`source: "none"`) — the route returns a 500 saying
 *      Gemini is not configured.
 *
 * Keys never leave server routes: the client only ever sends the
 * boolean `useOwnKey` flag. Nothing in this module runs in the browser.
 */

export type ApiKeySource = "byok" | "shared" | "none";

export interface ResolvedApiKey {
  key: string | null;
  source: ApiKeySource;
  /** Supabase user id when the caller was verified, else null. */
  userId: string | null;
}

export interface StoredByokKey {
  encryptedKey: string;
  keyLast4: string;
  verifiedAt: string | null;
}

/** Gemini API keys start with `AIza`; accept 20+ trailing chars. */
export function isValidGeminiKeyFormat(key: string): boolean {
  return /^AIza[0-9A-Za-z_-]{20,}$/.test(key.trim());
}

/**
 * Pure source selection: given the stored (encrypted) key and the
 * shared key, pick one. `secret` defaults to the server env secret.
 * Testable without Supabase or a network.
 */
export function resolveApiKeySource(options: {
  useOwnKey: boolean;
  encryptedKey: string | null;
  sharedKey: string | undefined;
  secret?: string | null;
}): ResolvedApiKey {
  const secret = options.secret ?? getByokEncryptionSecret();

  if (options.useOwnKey && options.encryptedKey && secret) {
    const decrypted = decryptApiKey(options.encryptedKey, secret);
    if (decrypted) {
      return { key: decrypted, source: "byok", userId: null };
    }
    // Stored key undecryptable: fall through to the shared key.
  }

  if (options.sharedKey) {
    return { key: options.sharedKey, source: "shared", userId: null };
  }

  return { key: null, source: "none", userId: null };
}

/** Last 4 chars of a key, for display — never the key itself. */
export { keyLast4 };

type AuthedClientFactory = (
  accessToken: string
) => SupabaseClient | null;

/**
 * Fetch the caller's stored BYOK key row via their own authed client
 * (RLS: own row only). Returns null on every failure path — Supabase
 * unconfigured, no token, no row, or the table not created yet
 * (migration 0005 not run) — so callers always fall back to the shared
 * key instead of erroring.
 *
 * Columns are the live `user_api_keys` shape from migration
 * 0005_byok_keys.sql: `encrypted_key`, `key_hint` (last 4 chars),
 * `is_valid`, `last_validated_at`. Only the caller's Gemini row is
 * read (the table is unique on (user_id, provider)); a row marked
 * invalid is treated as absent.
 */
export async function fetchStoredByokKey(
  userId: string,
  accessToken: string,
  createClientFn: AuthedClientFactory = createAuthedServerClient
): Promise<StoredByokKey | null> {
  const client = createClientFn(accessToken);
  if (!client || !userId) return null;

  try {
    const { data, error } = await client
      .from("user_api_keys")
      .select("encrypted_key, key_hint, is_valid, last_validated_at")
      .eq("user_id", userId)
      .eq("provider", "gemini")
      .eq("is_valid", true)
      .maybeSingle();

    if (error || !data || typeof data.encrypted_key !== "string") {
      return null;
    }
    return {
      encryptedKey: data.encrypted_key,
      keyLast4: typeof data.key_hint === "string" ? data.key_hint : "",
      verifiedAt:
        typeof data.last_validated_at === "string"
          ? data.last_validated_at
          : null,
    };
  } catch {
    return null;
  }
}

export interface ResolveCallerApiKeyOptions {
  /** Client's "use my key" flag (body.useOwnKey === true). */
  useOwnKey: boolean;
  sharedKey: string | undefined;
  /**
   * Dedupe: when the caller already verified the request's Bearer
   * token with the same getUser check (same Supabase URL + anon key,
   * same 2 s timeout, same fail-open null), pass the resulting user
   * id — null when the token was absent or invalid — to skip a second
   * verification round-trip for the same token. Omit to verify here.
   * Only the user id is shared; the token itself is still read from
   * the header for the BYOK fetch below. The chat route passes its
   * getAuthedServerContext verdict; other routes keep verifying.
   */
  verifiedUserId?: string | null;
  /** Test seam: override token verification. Routes omit it. */
  verifyToken?: (token: string) => Promise<string | null>;
  /** Test seam: override the stored-key fetch. Routes omit it. */
  fetchStoredKey?: (
    userId: string,
    accessToken: string
  ) => Promise<StoredByokKey | null>;
  /** Test seam: override the encryption secret. Routes omit it. */
  secret?: string | null;
}

/**
 * Full resolution for a route: verify the caller, load their stored
 * key when they asked for it, pick BYOK or shared. Never throws —
 * any failure lands on the shared key (or "none" when that is unset).
 */
export async function resolveCallerApiKey(
  request: Request,
  options: ResolveCallerApiKeyOptions
): Promise<ResolvedApiKey> {
  const token = getBearerToken(request);
  const verify = options.verifyToken ?? verifyAccessToken;
  // A pre-verified verdict (user id, or null for guest/invalid)
  // skips the second getUser round-trip for the same token; without
  // one, verify here — guests (no token) never verify at all.
  const userId =
    options.verifiedUserId !== undefined
      ? options.verifiedUserId
      : token
        ? await verify(token).catch(() => null)
        : null;

  let encryptedKey: string | null = null;
  if (options.useOwnKey && userId) {
    const fetchKey =
      options.fetchStoredKey ?? fetchStoredByokKey;
    const stored = await fetchKey(userId, token).catch(() => null);
    encryptedKey = stored?.encryptedKey ?? null;
  }

  const resolved = resolveApiKeySource({
    useOwnKey: options.useOwnKey,
    encryptedKey,
    sharedKey: options.sharedKey,
    secret: options.secret,
  });
  return { ...resolved, userId };
}

// ------------------------------------------------------------ key verify

export interface GeminiKeyCheck {
  valid: boolean;
  /** Plain-words reason when not valid, or when the check itself failed. */
  error?: string;
}

const VERIFY_TIMEOUT_MS = 8000;

/**
 * Verify a Gemini key against Google's models list endpoint — a cheap
 * read that proves the key is accepted, without spending any generation
 * quota. The key is sent only to Google, server-side, as the API's own
 * auth mechanism. `fetchFn` is a test seam; routes use global fetch.
 */
export async function verifyGeminiKey(
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<GeminiKeyCheck> {
  if (!isValidGeminiKeyFormat(apiKey)) {
    return {
      valid: false,
      error: "That doesn't look like a Gemini API key (it starts with AIza).",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const response = await fetchFn(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(
        apiKey.trim()
      )}`,
      { signal: controller.signal }
    );

    if (response.ok) return { valid: true };
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return {
        valid: false,
        error: "Google rejected this key. Check it was copied in full from AI Studio.",
      };
    }
    return {
      valid: false,
      error: `Google returned ${response.status}. Please try again shortly.`,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        valid: false,
        error: "Verification timed out. Please try again.",
      };
    }
    return {
      valid: false,
      error: "Could not reach Google to verify the key. Please try again.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

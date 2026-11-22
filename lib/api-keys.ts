import { createHash, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Public API keys (`anvix_live_...`).
 *
 * - Only the SHA-256 hash is ever stored (`api_keys.key_hash`); the
 *   plaintext key is shown to its owner exactly once, at creation.
 * - Verification runs through the `verify_api_key` SECURITY DEFINER
 *   function in `supabase/schema.sql`: an API call arrives with no
 *   signed-in user, so RLS cannot see the row — the function takes a
 *   hash and returns only the owner id + limits, never the hash.
 *   If that function was never installed (SQL not run), verification
 *   fails closed: no key is accepted.
 * - Until BYOK lands, every key draws on the app's shared Gemini quota,
 *   so each key has a strict per-minute limit and a hard daily cap, plus
 *   a global daily ceiling for the whole public API (see
 *   `app/api/v1/chat/route.ts`). When BYOK exists, a key should be tied
 *   to the owner's own Gemini key instead — see docs/public-api.md.
 * - Rate-limit counters are in-memory per instance, same caveat as
 *   `lib/rate-limit.ts`: they stop one script burning the shared key,
 *   they are not a billing-grade meter.
 */

export const API_KEY_PREFIX = "anvix_live_";
const KEY_BYTES = 32;
const DEFAULT_SCOPES = ["chat"];
export const DEFAULT_RATE_LIMIT_PER_MIN = 30;
export const DEFAULT_DAILY_CAP = 100;
/** Hard ceiling for the whole public API per day (shared Gemini key). */
export const PUBLIC_API_GLOBAL_DAILY_CAP = 500;

export interface ApiKeyRecord {
  id: string;
  userId: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  rateLimitPerMin: number;
  dailyCap: number;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface VerifiedApiKey {
  keyId: string;
  userId: string;
  scopes: string[];
  rateLimitPerMin: number;
  dailyCap: number;
}

/** Generate a new plaintext key. The `anvix_live_` prefix identifies it. */
export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(KEY_BYTES).toString("base64url")}`;
}

/** SHA-256 hex of a plaintext key — the only form ever stored. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/** The first 12 characters shown in key lists (never enough to use). */
export function keyDisplayPrefix(key: string): string {
  return key.slice(0, 12);
}

function anonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  try {
    return createClient(url, anonKey);
  } catch {
    return null;
  }
}

export type CreateApiKeyResult =
  | {
      success: true;
      /** Plaintext key — show once, then it is gone forever. */
      key: string;
      record: ApiKeyRecord;
    }
  | { success: false; error: string };

/** Create a key for a user. `client` must be the user's authed client. */
export async function createApiKey(
  client: SupabaseClient,
  userId: string,
  name: string
): Promise<CreateApiKeyResult> {
  const trimmedName = name.trim() || "Default key";
  const key = generateApiKey();
  const { data, error } = await client
    .from("api_keys")
    .insert({
      user_id: userId,
      key_hash: hashApiKey(key),
      key_prefix: keyDisplayPrefix(key),
      name: trimmedName,
      scopes: DEFAULT_SCOPES,
      rate_limit_per_min: DEFAULT_RATE_LIMIT_PER_MIN,
      daily_cap: DEFAULT_DAILY_CAP,
    })
    .select(
      "id, user_id, key_prefix, name, scopes, rate_limit_per_min, daily_cap, last_used_at, created_at, revoked_at"
    )
    .single();

  if (error || !data) {
    return {
      success: false,
      error:
        "Could not create an API key. The api_keys table may not be set up yet — run supabase/schema.sql first.",
    };
  }
  const row = data as Record<string, unknown>;
  return {
    success: true,
    key,
    record: {
      id: String(row.id),
      userId: String(row.user_id),
      keyPrefix: String(row.key_prefix),
      name: String(row.name),
      scopes: (row.scopes as string[]) ?? ["chat"],
      rateLimitPerMin: Number(row.rate_limit_per_min),
      dailyCap: Number(row.daily_cap),
      lastUsedAt: (row.last_used_at as string | null) ?? null,
      createdAt: String(row.created_at),
      revokedAt: (row.revoked_at as string | null) ?? null,
    },
  };
}

/** List a user's keys (never hashes). `client` is the user's authed client. */
export async function listApiKeys(
  client: SupabaseClient,
  userId: string
): Promise<ApiKeyRecord[]> {
  const { data, error } = await client
    .from("api_keys")
    .select(
      "id, user_id, key_prefix, name, scopes, rate_limit_per_min, daily_cap, last_used_at, created_at, revoked_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    keyPrefix: String(row.key_prefix),
    name: String(row.name),
    scopes: (row.scopes as string[]) ?? ["chat"],
    rateLimitPerMin: Number(row.rate_limit_per_min),
    dailyCap: Number(row.daily_cap),
    lastUsedAt: (row.last_used_at as string | null) ?? null,
    createdAt: String(row.created_at),
    revokedAt: (row.revoked_at as string | null) ?? null,
  }));
}

/** Revoke one of the user's keys. Returns false when not found / not owned. */
export async function revokeApiKey(
  client: SupabaseClient,
  userId: string,
  keyId: string
): Promise<boolean> {
  const { data, error } = await client
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id");
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

/**
 * Extract a candidate API key from a request: `X-API-Key` first, then
 * `Authorization: Bearer anvix_live_...`.
 */
export function extractApiKey(request: Request): string | null {
  const header = request.headers.get("x-api-key")?.trim();
  if (header) return header;
  const auth = request.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (token.startsWith(API_KEY_PREFIX)) return token;
  }
  return null;
}

/**
 * Verify a plaintext API key against the database. Returns the key's
 * owner + limits, or null when the key is unknown, revoked, or the
 * verification function is not installed. Never throws. Best-effort
 * updates `last_used_at` — a failure there does not fail the call.
 */
export async function verifyApiKey(
  key: string,
  client: SupabaseClient | null = anonClient()
): Promise<VerifiedApiKey | null> {
  if (!key.startsWith(API_KEY_PREFIX) || !client) return null;
  let rows: unknown;
  try {
    const { data, error } = await client.rpc("verify_api_key", {
      p_key_hash: hashApiKey(key),
    });
    if (error || !data) return null;
    rows = data;
  } catch {
    return null;
  }
  const row = (Array.isArray(rows) ? rows[0] : null) as Record<
    string,
    unknown
  > | null;
  if (!row) return null;
  const verified: VerifiedApiKey = {
    keyId: String(row.key_id),
    userId: String(row.owner_id),
    scopes: (row.scopes as string[]) ?? ["chat"],
    rateLimitPerMin: Number(row.rate_limit_per_min),
    dailyCap: Number(row.daily_cap),
  };
  // Best-effort usage stamp; never blocks the call.
  try {
    await client.rpc("touch_api_key", { p_key_hash: hashApiKey(key) });
  } catch {
    // ignore
  }
  return verified;
}

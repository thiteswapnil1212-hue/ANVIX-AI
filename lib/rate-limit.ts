import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Sliding-window rate limiter for the AI API routes.
 *
 * One shared GEMINI_API_KEY means every user shares one tiny free-tier
 * quota — without this, a single script hammering /api/chat could exhaust
 * the whole app's daily allowance. Limits are per scope (chat, build,
 * agent, ...) and per caller: a signed-in user's id when the request
 * carries a verifiable Supabase access token, otherwise the client IP.
 *
 * Honest limits of this approach (do not pretend otherwise):
 * - Counters live in memory, per server instance. On Vercel serverless
 *   that means the effective limit is per instance, and counters reset
 *   when an instance recycles. It still stops the realistic abuse case —
 *   one script burning the shared key — without needing an external
 *   store. If ANVIX grows past one instance, swap the Map for
 *   Upstash/Redis behind this same interface.
 * - Signed-out users behind one shared IP (e.g. a college NAT) share
 *   one IP bucket. Signing in gives each user their own bucket.
 * - Token verification used to cost one Supabase Auth round-trip per
 *   request (capped at 2s, fail-open to IP keying). A short-lived
 *   verified-token cache (below) now removes that pre-flight latency
 *   on warm instances — keyed by SHA-256 of the token, 60 s TTL, and
 *   used only to pick the rate-limit bucket, never for an
 *   authorization decision.
 */

type Window = number[]; // request timestamps (ms) inside the window

const windows = new Map<string, Window>();

// Opportunistic cleanup so the map cannot grow without bound.
const MAX_KEYS = 10_000;
// Longer than any window in use (all current windows are 60s).
const STALE_KEY_MS = 3_600_000;

function prune(now: number) {
  if (windows.size < MAX_KEYS) return;
  for (const [key, stamps] of windows) {
    const newest = stamps[stamps.length - 1];
    if (newest === undefined || newest < now - STALE_KEY_MS) {
      windows.delete(key);
    }
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/**
 * Sliding-window check: at most `limit` requests per `windowMs` for
 * `key`. Old timestamps fall out of the window as time passes, so the
 * limit refills gradually instead of resetting in a burst at a fixed
 * boundary. `nowMs` exists so tests can move time deterministically.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  nowMs: number = Date.now()
): RateLimitResult {
  const now = nowMs;
  prune(now);

  let stamps = windows.get(key);
  if (!stamps) {
    stamps = [];
    windows.set(key, stamps);
  }

  // Drop requests older than the window.
  while (stamps.length > 0 && (stamps[0] as number) <= now - windowMs) {
    stamps.shift();
  }

  if (stamps.length >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(((stamps[0] as number) + windowMs - now) / 1000)
      ),
    };
  }

  stamps.push(now);
  return { ok: true, retryAfterSeconds: 0 };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

// --- Signed-in caller identity -------------------------------------------

let serverSupabase: SupabaseClient | null | undefined;

function getServerSupabase(): SupabaseClient | null {
  if (serverSupabase !== undefined) return serverSupabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  serverSupabase =
    url && anonKey ? createClient(url, anonKey) : null;
  return serverSupabase;
}

// Never let token verification stall a request: fail open to IP keying.
const VERIFY_TIMEOUT_MS = 2000;

// Verified-token cache (perf): verifyAccessToken costs one Supabase
// Auth round-trip per signed-in request (capped at 2 s). A short-lived
// cache removes that pre-flight latency on warm instances. Keyed by
// SHA-256 of the token — the raw token is never stored. Used ONLY to
// pick the rate-limit bucket, never for an authorization decision;
// worst case, a revoked token keeps its per-user bucket for <= 60 s
// instead of falling back to the IP bucket. Per function instance,
// like the `windows` map above. Only successful verifications are
// cached; failures still fall back to IP keying every time.
const TOKEN_CACHE_TTL_MS = 60_000;
const TOKEN_CACHE_MAX_ENTRIES = 10_000;
const verifiedTokenCache = new Map<
  string,
  { userId: string; expiresAt: number }
>();

function tokenCacheKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Read the JWT `exp` claim WITHOUT verifying the token — the verify
// call still does the real verification on a cache miss. Returns the
// expiry in ms, or null when the token is not a decodable JWT.
function readTokenExpiryMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return null;
    const payload = JSON.parse(
      Buffer.from(
        parts[1].replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      ).toString("utf8")
    ) as unknown;
    if (!payload || typeof payload !== "object") return null;
    const exp = (payload as Record<string, unknown>).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function cacheVerifiedToken(
  token: string,
  userId: string,
  now: number
): void {
  const expMs = readTokenExpiryMs(token);
  // TTL: 60 s, or the token's exp minus 30 s, whichever is sooner.
  const ttl =
    expMs === null
      ? TOKEN_CACHE_TTL_MS
      : Math.min(TOKEN_CACHE_TTL_MS, expMs - 30_000 - now);
  if (ttl <= 0) return;
  if (verifiedTokenCache.size >= TOKEN_CACHE_MAX_ENTRIES) {
    for (const [key, entry] of verifiedTokenCache) {
      if (entry.expiresAt <= now) verifiedTokenCache.delete(key);
    }
    if (verifiedTokenCache.size >= TOKEN_CACHE_MAX_ENTRIES) return;
  }
  verifiedTokenCache.set(tokenCacheKey(token), {
    userId,
    expiresAt: now + ttl,
  });
}

// Verify with the short-lived cache in front: a hit skips the
// network call; a miss verifies and stores the success.
async function cachedVerifyToken(
  token: string,
  verify: (token: string) => Promise<string | null>
): Promise<string | null> {
  const key = tokenCacheKey(token);
  const now = Date.now();
  const cached = verifiedTokenCache.get(key);
  if (cached) {
    if (cached.expiresAt > now) return cached.userId;
    verifiedTokenCache.delete(key);
  }
  const userId = await verify(token).catch(() => null);
  if (userId) cacheVerifiedToken(token, userId, Date.now());
  return userId;
}

/** Returns the Supabase user id for a valid access token, else null. */
async function verifyAccessToken(token: string): Promise<string | null> {
  const client = getServerSupabase();
  if (!client) return null;

  try {
    const userId = await Promise.race([
      client.auth
        .getUser(token)
        .then(({ data }) => data.user?.id ?? null),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), VERIFY_TIMEOUT_MS)
      ),
    ]);
    return userId;
  } catch {
    // Auth unreachable, token invalid, anything else: fall back to IP.
    return null;
  }
}

export interface RateLimitKeyOptions {
  /**
   * Test seam: override token verification. Routes omit this and use
   * the real Supabase check above. Verification results are cached
   * briefly (60 s, keyed by token hash) whether the default or an
   * override verifier runs, so tests sharing one token share one
   * cached result — use a distinct token per test.
   */
  verifyToken?: (token: string) => Promise<string | null>;
}

/**
 * The canonical limiter key for a caller: `scope:user:<id>` when
 * signed in, else `scope:ip:<ip>`. The quota meter (/api/usage) builds
 * the same keys so its counts line up with the limiter's buckets.
 */
export function callerRateLimitKey(
  scope: string,
  userId: string | null,
  ip: string
): string {
  return userId ? `${scope}:user:${userId}` : `${scope}:ip:${ip}`;
}

/**
 * How many requests a caller made recently, read straight from the
 * limiter's own windows — the quota meter's fallback when the
 * `usage_events` table is unavailable. `keyPrefix` is a full caller
 * key (`chat:user:<id>`) or a scope prefix (`chat:`). Only timestamps
 * inside the last `windowMs` count.
 */
export function countRecentRequests(
  keyPrefix: string,
  windowMs: number,
  nowMs: number = Date.now()
): number {
  const cutoff = nowMs - windowMs;
  let total = 0;
  for (const [key, stamps] of windows) {
    if (!key.startsWith(keyPrefix)) continue;
    for (const stamp of stamps) {
      if (stamp > cutoff) total += 1;
    }
  }
  return total;
}

/**
 * The limiter key for this request: `scope:user:<id>` when the request
 * carries a verifiable Supabase access token, else `scope:ip:<ip>`.
 * Never throws — any verification failure falls back to IP keying.
 */
export async function resolveRateLimitKey(
  request: Request,
  scope: string,
  options: RateLimitKeyOptions = {}
): Promise<string> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice("Bearer ".length).trim()
    : "";

  if (token) {
    const verify = options.verifyToken ?? verifyAccessToken;
    const userId = await cachedVerifyToken(token, verify);
    if (userId) return `${scope}:user:${userId}`;
  }

  return callerRateLimitKey(scope, null, getClientIp(request));
}

/**
 * Returns a 429 response when the caller is over the limit for `scope`,
 * or null when the request may proceed. Usage:
 *
 *   const limited = await enforceRateLimit(request, "chat", 30, 60_000);
 *   if (limited) return limited;
 *
 * The 429 is plain JSON with a Retry-After header and a plain-words
 * message — the route never crashes on abuse, it just says slow down.
 */
export async function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
  options: RateLimitKeyOptions = {}
): Promise<Response | null> {
  const key = await resolveRateLimitKey(request, scope, options);
  const { ok, retryAfterSeconds } = rateLimit(key, limit, windowMs);

  if (ok) return null;

  return new Response(
    JSON.stringify({
      error: "Too many requests. Please slow down and try again shortly.",
      retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

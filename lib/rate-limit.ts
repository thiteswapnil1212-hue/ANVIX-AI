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
 * - Token verification costs one Supabase Auth round-trip per request
 *   (capped at 2s, fail-open to IP keying). A short-lived verified-token
 *   cache is the obvious optimisation if that latency ever matters.
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
   * the real Supabase check above.
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
    const userId = await verify(token).catch(() => null);
    if (userId) return callerRateLimitKey(scope, userId, getClientIp(request));
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

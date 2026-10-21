import { NextResponse } from "next/server";

/**
 * Minimal in-memory, fixed-window rate limiter for the API routes.
 *
 * Honest limits of this approach: counters live per server instance, so on
 * a multi-instance deployment the effective limit is per instance, and
 * counters reset when an instance recycles. That still stops the realistic
 * abuse case for this app — a single script hammering the endpoints and
 * burning the shared GEMINI_API_KEY — without needing an external store.
 * If ANVIX grows past one instance, swap the Map for Upstash/Redis behind
 * this same interface.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map cannot grow without bound.
const MAX_BUCKETS = 10_000;

function prune(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  prune(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000)
      ),
    };
  }

  bucket.count += 1;
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

/**
 * Returns a 429 response when the caller is over the limit for `scope`,
 * or null when the request may proceed. Usage:
 *
 *   const limited = enforceRateLimit(request, "chat", 30, 60_000);
 *   if (limited) return limited;
 */
export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const { ok, retryAfterSeconds } = rateLimit(
    `${scope}:${getClientIp(request)}`,
    limit,
    windowMs
  );

  if (ok) return null;

  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
}

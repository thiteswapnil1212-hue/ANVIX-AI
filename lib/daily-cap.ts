import { resolveRateLimitKey, type RateLimitKeyOptions } from "./rate-limit.ts";

/**
 * Per-day caps for the free media lanes (image gen, TTS, compare).
 *
 * Same honest limits as the sliding-window limiter in `rate-limit.ts`:
 * counters live in memory, per server instance, and reset when an
 * instance recycles. On Vercel serverless that makes a daily cap
 * per-instance rather than global — it still stops the realistic abuse
 * case (one caller burning the shared free lane all day) without
 * needing an external store. If ANVIX grows past one instance, swap
 * the Map for Upstash/Redis behind this same interface.
 *
 * A "day" is a UTC calendar day, so the cap refills at 00:00 UTC for
 * everyone instead of rolling per caller.
 */

export const IMAGE_DAILY_CAP = 10;
export const TTS_DAILY_CAP = 5;
export const COMPARE_DAILY_CAP = 5;

type DayBucket = {
  day: string; // "YYYY-MM-DD" (UTC)
  count: number;
};

const buckets = new Map<string, DayBucket>();

const MAX_KEYS = 10_000;

export function utcDay(nowMs: number = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * Pure core: consume one unit of `scope` for `key` on the UTC day of
 * `nowMs`. Returns the remaining allowance (0 when the cap is hit).
 * `nowMs` exists so tests can move time deterministically.
 */
export function consumeDaily(
  key: string,
  limit: number,
  nowMs: number = Date.now()
): { ok: boolean; remaining: number; resetsAt: string } {
  const day = utcDay(nowMs);
  const resetsAt = `${day}T23:59:59.999Z`;

  if (buckets.size >= MAX_KEYS) {
    for (const [k, bucket] of buckets) {
      if (bucket.day !== day) buckets.delete(k);
    }
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.day !== day) {
    bucket = { day, count: 0 };
    buckets.set(key, bucket);
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetsAt };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, resetsAt };
}

/** How many units of `scope` the caller has left today (no consume). */
export function dailyRemaining(
  key: string,
  limit: number,
  nowMs: number = Date.now()
): number {
  const bucket = buckets.get(key);
  if (!bucket || bucket.day !== utcDay(nowMs)) return limit;
  return Math.max(0, limit - bucket.count);
}

export interface DailyCapOptions extends RateLimitKeyOptions {
  /** Test seam: override the clock. */
  nowMs?: number;
}

/**
 * Returns a 429 JSON response when the caller has used up today's
 * allowance for `scope`, or null when the request may proceed (and
 * one unit is consumed). The key is the same per-user/per-IP key as
 * the rate limiter, so a signed-in user gets their own daily bucket.
 */
export async function enforceDailyCap(
  request: Request,
  scope: string,
  limit: number,
  options: DailyCapOptions = {}
): Promise<Response | null> {
  const key = await resolveRateLimitKey(request, scope, options);
  const nowMs = options.nowMs ?? Date.now();
  const result = consumeDaily(`${scope}:${key}`, limit, nowMs);

  if (result.ok) return null;

  return new Response(
    JSON.stringify({
      error: `Daily limit reached for ${scope} (${limit}/day). Try again tomorrow.`,
      remaining: 0,
      resetsAt: result.resetsAt,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(
          Math.max(
            1,
            Math.ceil(
              (new Date(result.resetsAt).getTime() - nowMs) / 1000
            )
          )
        ),
      },
    }
  );
}

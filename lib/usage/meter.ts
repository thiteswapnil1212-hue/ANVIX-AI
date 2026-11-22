/**
 * Quota meter — "used X of today's free allowance", per caller.
 *
 * Data sources, in order:
 *   1. `usage_events` (Supabase) — hourly aggregates, one row per
 *      caller + scope + hour. The only durable source.
 *   2. In-memory staging buckets in this module — requests counted
 *      since the last flush to `usage_events`. A flush attempt runs at
 *      most once a minute and never blocks a response; a failed flush
 *      (table/RPC not created yet) backs off for 10 minutes and the
 *      counts stay in memory.
 *   3. The Wave 1 rate limiter's own windows (`countRecentRequests`
 *      in lib/rate-limit.ts) — the fallback when the DB is unavailable
 *      entirely. The /api/usage route picks this path; this module
 *      never touches the limiter directly.
 *
 * Individual requests are never stored: no prompts, no raw rows, one
 * counter per hour. "Today" is the UTC calendar day, and the allowance
 * is ANVIX's own daily allowance for the shared key — an app policy
 * number so one caller cannot eat the whole shared day, NOT a Google
 * published quota (Google does not publish a single RPD for these
 * models). Callers on their own key (BYOK) are not bound by the shared
 * allowance; the meter still shows their counts.
 */

export const USAGE_SCOPES = ["chat", "build", "agent", "generate"] as const;
export type UsageScope = (typeof USAGE_SCOPES)[number];

export function isUsageScope(value: unknown): value is UsageScope {
  return (
    typeof value === "string" &&
    (USAGE_SCOPES as readonly string[]).includes(value)
  );
}

/** Daily allowance per scope, for shared-key callers (app policy). */
export const DAILY_FREE_ALLOWANCE: Record<UsageScope, number> = {
  chat: 100,
  build: 10,
  agent: 20,
  generate: 20,
};

export interface QuotaMeter {
  scope: UsageScope;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  overLimit: boolean;
}

export function buildQuotaMeter(scope: UsageScope, used: number): QuotaMeter {
  const limit = DAILY_FREE_ALLOWANCE[scope];
  const safeUsed = Math.max(0, Math.floor(used));
  return {
    scope,
    used: safeUsed,
    limit,
    remaining: Math.max(0, limit - safeUsed),
    percentUsed: Math.min(100, Math.round((safeUsed / limit) * 100)),
    overLimit: safeUsed >= limit,
  };
}

export function buildQuotaMeters(
  usedByScope: Record<UsageScope, number>
): QuotaMeter[] {
  return USAGE_SCOPES.map((scope) => buildQuotaMeter(scope, usedByScope[scope] ?? 0));
}

// ------------------------------------------------------------ time buckets

/** Truncate a date to the start of its UTC hour, as an ISO string. */
export function hourStartIso(date: Date = new Date()): string {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

/** The UTC calendar day (`YYYY-MM-DD`) a date falls on. */
export function utcDayIso(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The caller identity stored in `usage_events`: the part of a
 * rate-limit key after the scope — `user:<uuid>` or `ip:<address>`.
 */
export function callerIdentity(rateLimitKey: string): string {
  const rest = rateLimitKey.split(":").slice(1).join(":");
  return rest || rateLimitKey;
}

// ------------------------------------------------------- in-memory staging

interface StagingBucket {
  callerKey: string;
  scope: UsageScope;
  hourStart: string;
  count: number;
  flushed: number;
}

const staging = new Map<string, StagingBucket>();

function bucketKey(
  callerKey: string,
  scope: UsageScope,
  hourStart: string
): string {
  return `${callerKey}|${scope}|${hourStart}`;
}

/** Count one request in the staging bucket for its UTC hour. */
export function recordUsage(
  scope: UsageScope,
  callerKey: string,
  now: Date = new Date()
): void {
  const hourStart = hourStartIso(now);
  const key = bucketKey(callerKey, scope, hourStart);
  const bucket = staging.get(key);
  if (bucket) {
    bucket.count += 1;
  } else {
    staging.set(key, {
      callerKey,
      scope,
      hourStart,
      count: 1,
      flushed: 0,
    });
  }
}

/** Test seam: read the staging buckets. Routes never call this. */
export function getStagingSnapshot(): StagingBucket[] {
  return [...staging.values()];
}

/** Test seam: clear all staging state. */
export function resetUsageStaging(): void {
  staging.clear();
  lastFlushAttemptMs = 0;
  unavailableUntilMs = 0;
}

/**
 * Counts not yet flushed to the DB, for one caller on one UTC day.
 * These are added on top of the `usage_events` rows so the meter is
 * never behind the requests already served.
 */
export function unflushedTodayCounts(
  callerKey: string,
  dayIso: string
): Record<UsageScope, number> {
  const counts: Record<UsageScope, number> = {
    chat: 0,
    build: 0,
    agent: 0,
    generate: 0,
  };
  for (const bucket of staging.values()) {
    if (bucket.callerKey !== callerKey) continue;
    if (!bucket.hourStart.startsWith(dayIso)) continue;
    counts[bucket.scope] += bucket.count - bucket.flushed;
  }
  return counts;
}

// ------------------------------------------------------------ aggregation

export interface UsageEventRow {
  scope: string;
  hour_start: string;
  request_count: number;
}

/**
 * Merge durable hourly rows + unflushed staging counts into today's
 * per-scope totals for one caller. Rows for other callers, other days,
 * or unknown scopes are ignored. Pure — unit-tested without a DB.
 */
export function aggregateTodayUsage(
  rows: UsageEventRow[],
  callerKey: string,
  dayIso: string
): Record<UsageScope, number> {
  const totals: Record<UsageScope, number> = {
    chat: 0,
    build: 0,
    agent: 0,
    generate: 0,
  };

  for (const row of rows) {
    if (!isUsageScope(row.scope)) continue;
    if (!row.hour_start.startsWith(dayIso)) continue;
    totals[row.scope] += Math.max(0, Math.floor(row.request_count) || 0);
  }

  const unflushed = unflushedTodayCounts(callerKey, dayIso);
  for (const scope of USAGE_SCOPES) {
    totals[scope] += unflushed[scope];
  }

  return totals;
}

// ------------------------------------------------------------------ flush

export interface UsageFlushRow {
  callerKey: string;
  scope: UsageScope;
  hourStart: string;
  /** Requests in this bucket not yet flushed. */
  count: number;
}

/**
 * Write one bucket increment to durable storage. Routes pass a closure
 * that calls `supabase.rpc("increment_usage", ...)` and returns true on
 * success; the meter never imports Supabase itself, so this stays
 * unit-testable and the DB stays a best-effort sink.
 */
export type FlushOneBucket = (row: UsageFlushRow) => Promise<boolean>;

const FLUSH_MIN_INTERVAL_MS = 60_000;
const FLUSH_BACKOFF_MS = 10 * 60_000;

let lastFlushAttemptMs = 0;
let unavailableUntilMs = 0;

export interface FlushResult {
  flushedBuckets: number;
  /** True when the flush was skipped (throttled or backed off). */
  skipped: boolean;
}

/**
 * Flush dirty staging buckets. At most once a minute; a failed bucket
 * backs off for 10 minutes (e.g. the SQL file was never run). Never
 * throws — a flush that cannot run leaves the counts in memory.
 */
export async function flushUsageBuckets(
  flushOne: FlushOneBucket,
  nowMs: number = Date.now()
): Promise<FlushResult> {
  if (nowMs < unavailableUntilMs) return { flushedBuckets: 0, skipped: true };
  if (nowMs - lastFlushAttemptMs < FLUSH_MIN_INTERVAL_MS) {
    return { flushedBuckets: 0, skipped: true };
  }
  lastFlushAttemptMs = nowMs;

  let flushedBuckets = 0;
  for (const bucket of staging.values()) {
    const pending = bucket.count - bucket.flushed;
    if (pending <= 0) continue;

    let ok = false;
    try {
      ok = await flushOne({
        callerKey: bucket.callerKey,
        scope: bucket.scope,
        hourStart: bucket.hourStart,
        count: pending,
      });
    } catch {
      ok = false;
    }

    if (!ok) {
      // Table/RPC missing (or DB down): stop trying for a while.
      unavailableUntilMs = nowMs + FLUSH_BACKOFF_MS;
      return { flushedBuckets, skipped: false };
    }

    bucket.flushed += pending;
    flushedBuckets += 1;
  }

  return { flushedBuckets, skipped: false };
}

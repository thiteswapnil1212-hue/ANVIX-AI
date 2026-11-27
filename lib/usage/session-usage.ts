import {
  USAGE_SCOPES,
  buildQuotaMeter,
  type QuotaMeter,
  type UsageScope,
} from "./meter.ts";

/**
 * Session usage counts — the guest meter's missing half.
 *
 * Why this exists: the server quota meter (/api/usage) reads the
 * per-instance in-memory rate limiter for guests, and on Vercel
 * serverless the instance answering /api/usage almost never saw the
 * chat requests, so guests see "0 of 100" after real usage. The
 * durable server path (usage_events + increment_usage in
 * supabase/byok-usage.sql) was never applied to the live project, so
 * it cannot help either — see BUILD_LOG.md, meter-latex-fixes.
 *
 * Until that SQL is run, the only place that reliably knows a guest's
 * usage is the browser that made the requests. These counters live in
 * localStorage, one per UTC day, counts only — no prompts, no IPs, no
 * identities, nothing ever sent to the server. The Settings page shows
 * the higher of the server count and the session count per scope, so
 * the meter reflects the guest's actual usage in this browser session
 * without ever overstating it (max, never a sum).
 *
 * This is display only: rate-limit enforcement is untouched and
 * still happens server-side.
 */

export const SESSION_USAGE_KEY = "anvix-session-usage";

export type SessionUsageCounts = Record<UsageScope, number>;

export function zeroSessionUsage(): SessionUsageCounts {
  return { chat: 0, build: 0, agent: 0, generate: 0 };
}

export function sessionUsageDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Minimal storage seam: localStorage in the browser, a fake in tests. */
export interface SessionUsageStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStore(): SessionUsageStore | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Storage unavailable (private mode, disabled cookies).
    return null;
  }
}

interface StoredSessionUsage {
  day: string;
  counts: Partial<Record<UsageScope, number>>;
}

function parseStored(raw: string | null, day: string): SessionUsageCounts {
  const counts = zeroSessionUsage();
  if (!raw) return counts;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSessionUsage>;
    if (parsed.day !== day || !parsed.counts) return counts;
    for (const scope of USAGE_SCOPES) {
      const value = parsed.counts[scope];
      if (typeof value === "number" && Number.isFinite(value)) {
        counts[scope] = Math.max(0, Math.floor(value));
      }
    }
  } catch {
    // Corrupt value: treat as no usage rather than crashing.
    return zeroSessionUsage();
  }
  return counts;
}

/** Today's session counts for this browser. Never throws. */
export function readSessionUsage(
  store: SessionUsageStore | null = defaultStore(),
  now: Date = new Date()
): SessionUsageCounts {
  if (!store) return zeroSessionUsage();
  try {
    return parseStored(store.getItem(SESSION_USAGE_KEY), sessionUsageDay(now));
  } catch {
    return zeroSessionUsage();
  }
}

/**
 * Count one use in this browser session. Day rolls over at UTC
 * midnight (a stale day resets to zero first). Never throws — storage
 * can be unavailable or full, and the meter must not break the page.
 */
export function recordSessionUsage(
  scope: UsageScope,
  store: SessionUsageStore | null = defaultStore(),
  now: Date = new Date()
): void {
  if (!store) return;
  const day = sessionUsageDay(now);
  const counts = readSessionUsage(store, now);
  counts[scope] += 1;
  try {
    const stored: StoredSessionUsage = { day, counts };
    store.setItem(SESSION_USAGE_KEY, JSON.stringify(stored));
  } catch {
    // Quota exceeded / unavailable: the count is lost, the page is not.
  }
}

export interface MergedUsage {
  meters: QuotaMeter[];
  /** True when a session count raised at least one scope above the server count. */
  sessionIncluded: boolean;
}

/**
 * Merge server meters with this browser's session counts: each scope
 * shows the higher of the two. The server count is per-instance and
 * usually 0 for guests; the session count is this browser's real
 * usage today. Max (never a sum) so a request counted on both sides
 * is never counted twice.
 */
export function mergeSessionUsage(
  serverMeters: QuotaMeter[],
  session: SessionUsageCounts
): MergedUsage {
  let sessionIncluded = false;
  const meters = serverMeters.map((meter) => {
    const sessionUsed = session[meter.scope] ?? 0;
    if (sessionUsed > meter.used) {
      sessionIncluded = true;
      return buildQuotaMeter(meter.scope, sessionUsed);
    }
    return meter;
  });
  return { meters, sessionIncluded };
}

import { NextResponse } from "next/server";

import { fetchStoredByokKey } from "@/lib/byok/key-resolution";
import {
  callerRateLimitKey,
  countRecentRequests,
  getClientIp,
} from "@/lib/rate-limit";
import {
  USAGE_SCOPES,
  aggregateTodayUsage,
  buildQuotaMeters,
  utcDayIso,
  type UsageScope,
} from "@/lib/usage/meter";
import {
  createAuthedServerClient,
  getBearerToken,
  verifyAccessToken,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Quota meter — `GET /api/usage` returns today's per-scope usage for
 * the caller ("used X of today's free allowance"), plus whether they
 * are running on their own key.
 *
 * Data source, in order:
 *   1. `usage_events` hourly aggregates (signed-in callers only — the
 *      RLS policy only exposes `user:<own id>` rows), merged with the
 *      in-memory staging counts not yet flushed.
 *   2. The Wave 1 rate limiter's own windows (last 24h) when the DB
 *      is unavailable or the caller is a guest — labelled honestly as
 *      `source: "rate-limit"`, and per-instance, like the limiter.
 *
 * The response never contains a key, a prompt, or anyone else's usage.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const now = new Date();
  const dayIso = utcDayIso(now);
  const token = getBearerToken(request);
  const userId = token
    ? await verifyAccessToken(token).catch(() => null)
    : null;
  const ip = getClientIp(request);

  let meters: ReturnType<typeof buildQuotaMeters> | null = null;
  let source: "db" | "rate-limit" = "rate-limit";

  if (userId) {
    const identity = `user:${userId}`;
    const client = createAuthedServerClient(token);
    if (client) {
      try {
        const { data, error } = await client
          .from("usage_events")
          .select("scope, hour_start, request_count")
          .eq("caller_key", identity)
          .gte("hour_start", `${dayIso}T00:00:00.000Z`);

        if (!error && Array.isArray(data)) {
          const totals = aggregateTodayUsage(
            data as Array<{
              scope: string;
              hour_start: string;
              request_count: number;
            }>,
            identity,
            dayIso
          );
          meters = buildQuotaMeters(totals);
          source = "db";
        }
      } catch {
        // Table missing / DB down: fall through to the limiter counts.
      }
    }
  }

  if (!meters) {
    // Guest, or the DB path failed: read the limiter's own windows.
    // Signed-in callers get their user bucket; guests get their IP one.
    const totals = {} as Record<UsageScope, number>;
    for (const scope of USAGE_SCOPES) {
      totals[scope] = countRecentRequests(
        callerRateLimitKey(scope, userId, ip),
        DAY_MS,
        now.getTime()
      );
    }
    meters = buildQuotaMeters(totals);
    source = "rate-limit";
  }

  // Own-key status (signed-in only) so the UI can say the shared
  // allowance doesn't bind this caller.
  let byokActive = false;
  if (userId) {
    const stored = await fetchStoredByokKey(userId, token);
    byokActive = stored !== null;
  }

  return NextResponse.json({
    date: dayIso,
    source,
    byokActive,
    meters,
  });
}

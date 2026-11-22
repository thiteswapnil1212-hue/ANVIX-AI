import { flushUsageBuckets } from "./meter.ts";
import {
  createAuthedServerClient,
  getBearerToken,
  getServerSupabase,
} from "../supabase/server.ts";

/**
 * Fire-and-forget flush of the in-memory usage staging buckets to
 * `usage_events` (via the `increment_usage` RPC). Routes call this
 * after `recordUsage(...)`; it never blocks the response and never
 * throws. When Supabase is unconfigured there is nothing to flush to
 * and the call is a no-op.
 */
export function flushUsageInBackground(request: Request): void {
  const token = getBearerToken(request);
  const client =
    (token ? createAuthedServerClient(token) : null) ?? getServerSupabase();
  if (!client) return;

  void flushUsageBuckets(async (row) => {
    try {
      const { error } = await client.rpc("increment_usage", {
        p_caller_key: row.callerKey,
        p_scope: row.scope,
        p_hour_start: row.hourStart,
        p_count: row.count,
      });
      return !error;
    } catch {
      return false;
    }
  }).catch(() => undefined);
}

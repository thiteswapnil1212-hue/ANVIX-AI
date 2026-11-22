import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side caller identity for the app's own first-party API routes.
 *
 * The browser sends its Supabase access token as `Authorization:
 * Bearer <token>` (see lib/api/auth-headers.ts). This helper verifies
 * it and returns a Supabase client that carries the token, so Row
 * Level Security sees the real user (auth.uid()) instead of anon.
 *
 * Fail-open by design, exactly like the rate limiter: any failure
 * (no token, bad token, Supabase unreachable, timeout) returns null
 * and the route proceeds as a guest — it never throws, and it never
 * blocks a chat on auth.
 */

const VERIFY_TIMEOUT_MS = 2000;

export interface AuthedServerContext {
  userId: string;
  /** Client carrying the caller's token — RLS applies to this user. */
  client: SupabaseClient;
}

function getServerSupabase(
  token: string
): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  } catch {
    return null;
  }
}

/** Verify the request's Bearer token; null when guest / unverifiable. */
export async function getAuthedServerContext(
  request: Request
): Promise<AuthedServerContext | null> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice("Bearer ".length).trim()
    : "";
  if (!token) return null;

  const client = getServerSupabase(token);
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
    return userId ? { userId, client } : null;
  } catch {
    return null;
  }
}

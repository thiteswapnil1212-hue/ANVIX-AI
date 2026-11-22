import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Authenticated caller identity for the notification routes.
 *
 * Follows the same pattern as `lib/rate-limit.ts`: the client sends its
 * Supabase access token as `Authorization: Bearer <token>` (see
 * `lib/api/auth-headers.ts`); the server verifies it against Supabase
 * with a 2 s timeout. Notification routes are stricter than the AI
 * routes — there is no guest/IP fallback, because sending a notification
 * to someone else's subscriptions would be a real abuse vector. No
 * token, an invalid token, or an unconfigured Supabase project all mean
 * 401, and the route says so.
 */

const VERIFY_TIMEOUT_MS = 2000;

function getServerSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  try {
    return createClient(url, anonKey);
  } catch {
    return null;
  }
}

function bearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  return token || null;
}

export interface AuthenticatedCaller {
  userId: string;
  /**
   * Anon client that acts as this user (RLS applies as the caller), so
   * subscription/link rows can only ever be read or written for the
   * caller's own user id.
   */
  client: SupabaseClient;
}

/** Verify the request's Bearer token; null when unauthenticated. */
export async function getAuthenticatedCaller(
  request: Request
): Promise<AuthenticatedCaller | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const base = getServerSupabase();
  if (!base) return null;

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  try {
    const userId = await Promise.race([
      client.auth
        .getUser(token)
        .then(({ data }) => data.user?.id ?? null),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), VERIFY_TIMEOUT_MS)
      ),
    ]);
    if (!userId) return null;
    return { userId, client };
  } catch {
    return null;
  }
}

/**
 * True when a Supabase error means the notifications tables were never
 * created (run `supabase/notifications.sql`). Routes map this to a 503
 * with a setup hint instead of a generic 500.
 */
export function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.message?.includes("does not exist") === true
  );
}

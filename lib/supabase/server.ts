import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase helpers for API routes.
 *
 * Two clients, two jobs — do not mix them up:
 * - `getServerSupabase()` (anon key): verifies the caller's access token
 *   with Supabase Auth. It can never read another user's rows.
 * - `createAuthedServerClient(token)`: the same anon key plus the
 *   caller's `Authorization: Bearer <token>` header, so PostgREST runs
 *   as that user and RLS allows exactly their own rows. This is how a
 *   route reads the caller's BYOK key without ever needing the service
 *   role key — no service-role key exists in this codebase on purpose.
 *
 * Every helper returns null instead of throwing when Supabase is not
 * configured on the deployment, so routes degrade to guest/shared-key
 * behaviour instead of crashing.
 */

let serverSupabase: SupabaseClient | null | undefined;

export function getServerSupabase(): SupabaseClient | null {
  if (serverSupabase !== undefined) return serverSupabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    serverSupabase = url && anonKey ? createClient(url, anonKey) : null;
  } catch {
    serverSupabase = null;
  }
  return serverSupabase;
}

/** The Bearer token on a request, or "" when absent. */
export function getBearerToken(request: Request): string {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
}

// Never let token verification stall a request: fail open (null user).
const VERIFY_TIMEOUT_MS = 2000;

/** Returns the Supabase user id for a valid access token, else null. */
export async function verifyAccessToken(token: string): Promise<string | null> {
  const client = getServerSupabase();
  if (!client || !token) return null;

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
    return null;
  }
}

/**
 * A client that acts as the caller (RLS sees their uid). Returns null
 * when Supabase is unconfigured or no token was supplied.
 */
export function createAuthedServerClient(
  accessToken: string
): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !accessToken) return null;

  try {
    return createClient(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    return null;
  }
}

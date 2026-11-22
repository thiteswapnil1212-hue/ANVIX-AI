import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side caller identity for API routes.
 *
 * The app has no service-role key in the base, and adding one would let
 * routes bypass RLS — so routes run as the *caller*: the anon-key client
 * carries the caller's Bearer token, Supabase verifies it, and RLS
 * (`auth.uid() = user_id`) limits every query to that user's own rows.
 * Guests (no token) get null and the route answers 401 / honest
 * "sign in required" instead of touching the database.
 *
 * Follows the same fail-open-to-null pattern as the token verification in
 * `lib/rate-limit.ts` (2s cap, never throws).
 */

const VERIFY_TIMEOUT_MS = 2000;

export interface AuthedCaller {
  userId: string;
  /** Anon-key client carrying the caller's token, so RLS applies. */
  client: SupabaseClient;
}

function bearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  return token || null;
}

function getAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  try {
    return createClient(url, anonKey);
  } catch {
    return null;
  }
}

/**
 * Verify the request's Bearer token and return the caller, or null when
 * Supabase is unconfigured, the token is missing/invalid, or verification
 * times out. Never throws.
 */
export async function getAuthedCaller(
  request: Request
): Promise<AuthedCaller | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const base = getAnonClient();
  if (!base) return null;

  let userId: string | null = null;
  try {
    userId = await Promise.race([
      base.auth
        .getUser(token)
        .then(({ data }) => data.user?.id ?? null),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), VERIFY_TIMEOUT_MS)
      ),
    ]);
  } catch {
    return null;
  }
  if (!userId) return null;

  // A second client instance carrying the token, so PostgREST requests
  // run as this user and RLS policies see auth.uid() = userId.
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  return { userId, client };
}

/** Convenience: just the user id, or null. Never throws. */
export async function getServerUserId(
  request: Request
): Promise<string | null> {
  const caller = await getAuthedCaller(request).catch(() => null);
  return caller?.userId ?? null;
}

/**
 * Optional service-role client (bypasses RLS). Only used by the Google
 * OAuth callback, which arrives from Google as a plain browser redirect
 * with no Bearer token — the user id there comes from the HMAC-signed
 * `state` instead. Returns null when `SUPABASE_SERVICE_ROLE_KEY` is not
 * set; the callback then falls back to the signed setup-cookie flow
 * (see `app/api/integrations/google/complete/route.ts`), so the key is
 * genuinely optional. Never expose this key to the browser.
 */
export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  try {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    return null;
  }
}

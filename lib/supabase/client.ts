import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client.
 *
 * ANVIX is guest-first: when the Supabase env vars are not set on a
 * deployment, `supabase` is null and the app runs exactly as before —
 * chats and projects live only in the browser. When the vars are set,
 * auth and cloud sync switch on automatically. No code path may assume
 * the client exists; always check `isSupabaseConfigured` (or null) first.
 *
 * A malformed URL (e.g. a typo'd env var) makes `createClient` throw —
 * the factory catches that and returns null instead, so bad config
 * degrades to guest mode instead of crashing every page that imports
 * this module.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Build a browser client from explicit values, or null when they are
 * missing or unusable. Split out from the module-level singleton so it
 * is unit-testable without env vars.
 */
export function createBrowserClient(
  supabaseUrl: string | undefined,
  supabaseAnonKey: string | undefined
): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Session lives in browser storage and survives reloads; the
        // client refreshes an expiring token on its own. URL detection
        // is what makes OAuth / email-confirm / password-recovery
        // links work: the client exchanges the ?code= (or
        // #access_token) in the landing URL for a session.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch {
    return null;
  }
}

export const supabase: SupabaseClient | null = createBrowserClient(
  url,
  anonKey
);

/** True only when a usable client exists — not just env vars present. */
export const isSupabaseConfigured = supabase !== null;

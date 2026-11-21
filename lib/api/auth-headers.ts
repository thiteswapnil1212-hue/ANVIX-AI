import { supabase } from "@/lib/supabase/client";

/**
 * Authorization header for this app's own first-party AI routes, when
 * the user is signed in.
 *
 * The server verifies the token with Supabase and rate-limits by user
 * id; a signed-in user therefore gets their own bucket instead of
 * sharing the IP bucket with everyone on their network. Guests — or any
 * failure here — simply send no header and are limited by IP instead,
 * so this helper never breaks a request: it returns {} on every failure
 * path. The token is only ever sent to this app's own same-origin
 * routes, never to a third party.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client.
 *
 * ANVIX is guest-first: when the Supabase env vars are not set on a
 * deployment, `supabase` is null and the app runs exactly as before —
 * chats and projects live only in the browser. When the vars are set,
 * auth and cloud sync switch on automatically. No code path may assume
 * the client exists; always check `isSupabaseConfigured` (or null) first.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

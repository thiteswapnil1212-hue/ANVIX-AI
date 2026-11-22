import { NextResponse } from "next/server";
import { getAuthedCaller } from "@/lib/supabase/server-user";
import { isGoogleOAuthConfigured } from "@/lib/google/oauth";
import { loadGoogleConnection } from "@/lib/google/connections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/google/status
 * `{ configured, connected, scope }` for the signed-in caller.
 * `configured` = the deployment has Google OAuth env vars at all;
 * `connected` = this user has a stored, decryptable Google connection.
 * Guests get `connected: false` (never a 401 — the UI needs this state
 * to render the "sign in first" hint).
 */
export async function GET(request: Request) {
  const configured = isGoogleOAuthConfigured();
  const caller = await getAuthedCaller(request);
  if (!caller) {
    return NextResponse.json({ configured, connected: false, scope: "" });
  }

  const connection = await loadGoogleConnection(caller.client, caller.userId);
  return NextResponse.json({
    configured,
    connected: connection !== null,
    scope: connection?.scope ?? "",
  });
}

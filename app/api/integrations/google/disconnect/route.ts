import { NextResponse } from "next/server";
import { getAuthedCaller } from "@/lib/supabase/server-user";
import {
  deleteGoogleConnection,
  loadGoogleConnection,
} from "@/lib/google/connections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/google/disconnect
 * Deletes the caller's stored Google connection and best-effort revokes
 * the refresh token at Google, so the app can no longer read the user's
 * calendar even if the row somehow survived. Revocation failure is
 * ignored — the local delete is what matters.
 */
export async function POST(request: Request) {
  const caller = await getAuthedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to disconnect Google Calendar." },
      { status: 401 }
    );
  }

  const connection = await loadGoogleConnection(
    caller.client,
    caller.userId
  );
  if (connection) {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: connection.refreshToken,
        }).toString(),
      });
    } catch {
      // Revocation is best-effort; the local delete below is the guarantee.
    }
  }

  const deleted = await deleteGoogleConnection(caller.client, caller.userId);
  if (!deleted) {
    return NextResponse.json(
      { error: "Could not disconnect Google Calendar." },
      { status: 500 }
    );
  }
  return NextResponse.json({ disconnected: true });
}

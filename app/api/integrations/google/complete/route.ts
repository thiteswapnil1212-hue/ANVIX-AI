import { NextResponse } from "next/server";
import { getAuthedCaller } from "@/lib/supabase/server-user";
import {
  GOOGLE_SETUP_COOKIE,
  verifySetupPayload,
} from "@/lib/google/setup-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Complete a Google connect started without a service-role key: reads the
 * signed, httpOnly setup cookie set by the callback, verifies it, checks
 * the cookie's user id matches the caller's Bearer token, and writes the
 * connection row through RLS as that user. The cookie holds tokens that
 * are already AES-256-GCM encrypted, so they are stored as-is — no
 * plaintext token ever passes through this route. The cookie is cleared
 * whether the save succeeds or not (single use).
 */
export async function POST(request: Request) {
  const caller = await getAuthedCaller(request);
  const rawCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GOOGLE_SETUP_COOKIE}=`))
    ?.slice(GOOGLE_SETUP_COOKIE.length + 1);

  const clearCookie = (response: NextResponse) => {
    response.cookies.set(GOOGLE_SETUP_COOKIE, "", {
      httpOnly: true,
      path: "/api/integrations/google/complete",
      maxAge: 0,
    });
    return response;
  };

  if (!caller || !rawCookie) {
    return clearCookie(
      NextResponse.json(
        { error: "No pending Google connection to complete." },
        { status: 400 }
      )
    );
  }

  let payload;
  try {
    payload = verifySetupPayload(decodeURIComponent(rawCookie));
  } catch {
    return clearCookie(
      NextResponse.json(
        { error: "No pending Google connection to complete." },
        { status: 400 }
      )
    );
  }
  if (!payload || payload.userId !== caller.userId) {
    return clearCookie(
      NextResponse.json(
        { error: "No pending Google connection to complete." },
        { status: 400 }
      )
    );
  }

  const { error } = await caller.client
    .from("google_connections")
    .upsert({
      user_id: caller.userId,
      provider: "google",
      encrypted_refresh_token: payload.encryptedRefreshToken,
      encrypted_access_token: payload.encryptedAccessToken,
      access_token_expires_at: new Date(
        payload.accessTokenExpiresAt
      ).toISOString(),
      scope: payload.scope,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return clearCookie(
      NextResponse.json(
        { error: "Could not save the Google connection." },
        { status: 500 }
      )
    );
  }

  return clearCookie(NextResponse.json({ connected: true }));
}

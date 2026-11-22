import { NextResponse } from "next/server";
import { getAuthedCaller } from "@/lib/supabase/server-user";
import {
  buildGoogleAuthUrl,
  getGoogleOAuthConfig,
} from "@/lib/google/oauth";
import { signOAuthState } from "@/lib/google/oauth";
import { getGoogleRedirectUri } from "../redirect-uri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Start Google Calendar connect: signed-in users only.
 * Redirects the browser to Google's consent screen. The `state` is
 * HMAC-signed with the token-encryption key, so the callback can verify
 * it statelessly. When Google OAuth is not configured, this answers 503
 * with an honest message instead of redirecting anywhere.
 */
export async function GET(request: Request) {
  const caller = await getAuthedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to connect Google Calendar." },
      { status: 401 }
    );
  }

  const config = getGoogleOAuthConfig();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Google Calendar is not configured on this deployment yet. The owner needs to set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET — see docs/google-calendar-setup.md.",
      },
      { status: 503 }
    );
  }

  let state: string;
  try {
    state = signOAuthState(caller.userId);
  } catch {
    return NextResponse.json(
      {
        error:
          "Google Calendar is not configured on this deployment yet. The owner needs to set GOOGLE_TOKEN_ENCRYPTION_KEY — see docs/google-calendar-setup.md.",
      },
      { status: 503 }
    );
  }

  const url = buildGoogleAuthUrl(
    config,
    getGoogleRedirectUri(request),
    state
  );
  return NextResponse.redirect(url);
}

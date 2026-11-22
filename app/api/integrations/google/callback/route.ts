import { NextResponse } from "next/server";
import {
  exchangeAuthCode,
  getGoogleOAuthConfig,
  verifyOAuthState,
} from "@/lib/google/oauth";
import { encryptToken } from "@/lib/google/crypto";
import { saveGoogleConnection } from "@/lib/google/connections";
import {
  GOOGLE_SETUP_COOKIE,
  SETUP_TTL_MS,
  setupPayloadFromTokens,
  signSetupPayload,
} from "@/lib/google/setup-cookie";
import { getServiceClient } from "@/lib/supabase/server-user";
import { getGoogleRedirectUri } from "../redirect-uri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToCalendar(request: Request, params: Record<string, string>) {
  const url = new URL("/calendar", new URL(request.url).origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

/**
 * Google OAuth callback (`?code=…&state=…`).
 *
 * Verifies the HMAC-signed state (which carries the user id), exchanges
 * the code for tokens, then stores the connection:
 * - with `SUPABASE_SERVICE_ROLE_KEY` set: writes the row directly and
 *   redirects to `/calendar?google_connected=1`;
 * - without it: stores the encrypted tokens in a short-lived, httpOnly,
 *   signed setup cookie and redirects to `/calendar?google_setup=1`,
 *   where the page completes the save through an authed API call.
 * Any failure redirects to `/calendar` with `google_error` instead of
 * ever showing a stack trace or a bare 500.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const googleError = url.searchParams.get("error");

  if (googleError) {
    return redirectToCalendar(request, {
      google_error: "Google sign-in was cancelled or denied.",
    });
  }
  if (!code || !state) {
    return redirectToCalendar(request, {
      google_error: "Google did not return a complete sign-in response.",
    });
  }

  const userId = verifyOAuthState(state);
  if (!userId) {
    return redirectToCalendar(request, {
      google_error: "The sign-in request expired or was tampered with. Please try again.",
    });
  }

  const config = getGoogleOAuthConfig();
  if (!config) {
    return redirectToCalendar(request, {
      google_error: "Google Calendar is not configured on this deployment.",
    });
  }

  const tokens = await exchangeAuthCode(
    config,
    code,
    getGoogleRedirectUri(request)
  );
  if (!tokens || !tokens.refreshToken) {
    return redirectToCalendar(request, {
      google_error:
        "Google did not return a refresh token. Please disconnect first in Google Account settings and try again.",
    });
  }

  // Path 1: service-role write (optional env key).
  const service = getServiceClient();
  if (service) {
    const saved = await saveGoogleConnection(service, userId, tokens);
    if (!saved) {
      return redirectToCalendar(request, {
        google_error:
          "Connected to Google, but the connection could not be saved (encryption key or database).",
      });
    }
    return redirectToCalendar(request, { google_connected: "1" });
  }

  // Path 2: signed setup cookie; the Calendar page completes the save.
  const payload = setupPayloadFromTokens(userId, tokens, encryptToken);
  const signed = payload ? signSetupPayload(payload) : null;
  if (!signed) {
    return redirectToCalendar(request, {
      google_error:
        "Connected to Google, but the connection could not be saved (encryption key missing).",
    });
  }

  const response = redirectToCalendar(request, { google_setup: "1" });
  response.cookies.set(GOOGLE_SETUP_COOKIE, signed, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/api/integrations/google/complete",
    maxAge: Math.floor(SETUP_TTL_MS / 1000),
  });
  return response;
}

import { NextResponse } from "next/server";

import {
  GITHUB_OAUTH_STATE_COOKIE,
  GITHUB_TOKEN_COOKIE,
  GITHUB_TOKEN_MAX_AGE_SECONDS,
} from "@/lib/github/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GitHub OAuth callback: GET /api/github/callback?code=…&state=…
 *
 * Checks `state` against the cookie set by /api/github/auth, then
 * exchanges the code for a user access token using the Client
 * Secret (env GITHUB_OAUTH_CLIENT_SECRET — server-side only, never
 * shipped to the browser). The token is stored in an httpOnly
 * cookie scoped to /api/github: the browser can never read it, it
 * is never written to the database, and it is only ever sent to
 * this app's own GitHub routes, which forward it to api.github.com.
 * No GitHub account is created here — the user authorises their
 * own existing account.
 */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const settingsUrl = (params: Record<string, string>) => {
    const target = new URL("/settings", origin);
    for (const [key, value] of Object.entries(params)) {
      target.searchParams.set(key, value);
    }
    return target;
  };

  const cookieHeader = req.headers.get("cookie") ?? "";
  const expectedState = cookieHeader
    .split(";")
    .map((part) => part.trim().split("="))
    .find(([key]) => key === GITHUB_OAUTH_STATE_COOKIE)?.[1];

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      settingsUrl({ github: "error", reason: "state_mismatch" })
    );
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      settingsUrl({ github: "error", reason: "not_configured" })
    );
  }

  try {
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: `${origin}/api/github/callback`,
        }),
      }
    );

    const data = (await response.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!response.ok || !data.access_token) {
      return NextResponse.redirect(
        settingsUrl({ github: "error", reason: "exchange_failed" })
      );
    }

    const redirect = NextResponse.redirect(
      settingsUrl({ github: "connected" })
    );
    redirect.cookies.set(GITHUB_TOKEN_COOKIE, data.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https://"),
      path: "/api/github",
      maxAge: GITHUB_TOKEN_MAX_AGE_SECONDS,
    });
    redirect.cookies.set(GITHUB_OAUTH_STATE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https://"),
      path: "/api/github",
      maxAge: 0,
    });
    return redirect;
  } catch {
    return NextResponse.redirect(
      settingsUrl({ github: "error", reason: "exchange_failed" })
    );
  }
}

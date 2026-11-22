import { NextResponse } from "next/server";

import {
  GITHUB_OAUTH_STATE_COOKIE,
} from "@/lib/github/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Start GitHub OAuth: GET /api/github/auth
 *
 * Redirects to github.com/login/oauth/authorize with this app's
 * Client ID (env GITHUB_OAUTH_CLIENT_ID — the user registers the
 * OAuth App himself; nothing is hard-coded). Scope `repo` covers
 * creating repos and pushing files, plus reading private repos for
 * import. A random `state` value is stored in a short-lived
 * httpOnly cookie and checked by the callback.
 */
export async function GET(req: Request) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      {
        error: "github_not_configured",
        message:
          "GitHub export is not set up on this deployment yet (GITHUB_OAUTH_CLIENT_ID missing).",
      },
      { status: 503 }
    );
  }

  const origin = new URL(req.url).origin;
  const stateBytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set(
    "redirect_uri",
    `${origin}/api/github/callback`
  );
  authorize.searchParams.set("scope", "repo");
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  response.cookies.set(GITHUB_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/api/github",
    maxAge: 10 * 60,
  });
  return response;
}

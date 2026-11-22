import { NextResponse } from "next/server";

import {
  GITHUB_TOKEN_COOKIE,
  getGitHubTokenFromRequest,
} from "@/lib/github/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GitHub connection status: GET /api/github/status
 *
 * `configured` is false when the deployment has no OAuth Client ID
 * — the Settings panel then says so instead of offering a dead
 * Connect button. `connected` is verified live against
 * api.github.com/user, so a revoked token shows as disconnected
 * (and its cookie is cleared).
 */
export async function GET(req: Request) {
  const configured = Boolean(process.env.GITHUB_OAUTH_CLIENT_ID);
  const token = getGitHubTokenFromRequest(req);

  if (!token) {
    return NextResponse.json({ configured, connected: false });
  }

  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ANVIX-AI",
      },
    });

    if (!response.ok) {
      const cleared = NextResponse.json({ configured, connected: false });
      cleared.cookies.set(GITHUB_TOKEN_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/api/github",
        maxAge: 0,
      });
      return cleared;
    }

    const user = (await response.json()) as { login?: string };
    return NextResponse.json({
      configured,
      connected: true,
      login: user.login ?? null,
    });
  } catch {
    return NextResponse.json({ configured, connected: false });
  }
}

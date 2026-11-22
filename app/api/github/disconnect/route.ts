import { NextResponse } from "next/server";

import { GITHUB_TOKEN_COOKIE } from "@/lib/github/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Disconnect GitHub: POST /api/github/disconnect — clears the token cookie. */
export async function POST() {
  const response = NextResponse.json({ disconnected: true });
  response.cookies.set(GITHUB_TOKEN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/github",
    maxAge: 0,
  });
  return response;
}

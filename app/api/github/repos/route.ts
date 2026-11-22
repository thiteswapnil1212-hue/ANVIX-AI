import { NextResponse } from "next/server";

import {
  getGitHubTokenFromRequest,
  listUserRepos,
} from "@/lib/github/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List the user's repos (for the import picker): GET /api/github/repos */
export async function GET(req: Request) {
  const token = getGitHubTokenFromRequest(req);
  if (!token) {
    return NextResponse.json(
      {
        error: "github_not_connected",
        message: "Connect your GitHub account in Settings first.",
      },
      { status: 401 }
    );
  }

  try {
    const repos = await listUserRepos(token);
    return NextResponse.json({ repos });
  } catch (error) {
    return NextResponse.json(
      {
        error: "github_error",
        message:
          error instanceof Error ? error.message : "Could not list repos.",
      },
      { status: 502 }
    );
  }
}

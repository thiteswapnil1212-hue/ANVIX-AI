import { NextResponse } from "next/server";

import {
  getGitHubTokenFromRequest,
  importGitHubRepo,
} from "@/lib/github/server";
import { parseGitHubRepoUrl } from "@/lib/github/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Import a repo into the workspace: POST /api/github/import
 *
 * Body: { repoUrl } (or { owner, repo }). Reads the repo tree and
 * returns the importable source files (capped: 100 files, 1 MB
 * total, 200 KB per file, text files only — see lib/github/github.ts).
 * Public repos work without a connection; private repos need the
 * user's GitHub token (cookie). The client writes the files into
 * the workspace itself; nothing is stored server-side.
 */
export async function POST(req: Request) {
  let body: { repoUrl?: unknown; owner?: unknown; repo?: unknown };
  try {
    body = (await req.json()) as {
      repoUrl?: unknown;
      owner?: unknown;
      repo?: unknown;
    };
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Send a JSON body." },
      { status: 400 }
    );
  }

  let owner: string | undefined;
  let repo: string | undefined;

  if (typeof body.repoUrl === "string") {
    const parsed = parseGitHubRepoUrl(body.repoUrl);
    if (!parsed) {
      return NextResponse.json(
        {
          error: "invalid_body",
          message: "That does not look like a GitHub repo (owner/repo or github.com/owner/repo).",
        },
        { status: 400 }
      );
    }
    owner = parsed.owner;
    repo = parsed.repo;
  } else if (
    typeof body.owner === "string" &&
    typeof body.repo === "string"
  ) {
    owner = body.owner;
    repo = body.repo;
  }

  if (!owner || !repo) {
    return NextResponse.json(
      {
        error: "invalid_body",
        message: "Send a repo URL or an owner and repo name.",
      },
      { status: 400 }
    );
  }

  const token = getGitHubTokenFromRequest(req);

  try {
    const files = await importGitHubRepo(token, owner, repo);
    return NextResponse.json({ owner, repo, files });
  } catch (error) {
    return NextResponse.json(
      {
        error: "github_error",
        message:
          error instanceof Error ? error.message : "Could not import the repo.",
      },
      { status: 502 }
    );
  }
}

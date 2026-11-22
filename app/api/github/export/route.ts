import { NextResponse } from "next/server";

import {
  createGitHubRepo,
  getGitHubTokenFromRequest,
  pushFilesToRepo,
} from "@/lib/github/server";
import {
  checkExportCaps,
  slugifyRepoName,
  validateRepoName,
} from "@/lib/github/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Push a generated app to GitHub: POST /api/github/export
 *
 * Body: { name?, description?, private?, files: [{path, content}] }.
 * Creates a repo under the user's own account and pushes each file
 * with the contents API. The authorising credential is the user's
 * own OAuth token (cookie set by the GitHub OAuth flow) — the app
 * never holds a shared deploy token. 401 when GitHub is not
 * connected; 503 when the OAuth app is not configured.
 */
export async function POST(req: Request) {
  if (!process.env.GITHUB_OAUTH_CLIENT_ID) {
    return NextResponse.json(
      {
        error: "github_not_configured",
        message: "GitHub export is not set up on this deployment yet.",
      },
      { status: 503 }
    );
  }

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

  let body: {
    name?: unknown;
    description?: unknown;
    private?: unknown;
    files?: unknown;
  };
  try {
    body = (await req.json()) as {
      name?: unknown;
      description?: unknown;
      private?: unknown;
      files?: unknown;
    };
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Send a JSON body." },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.files)) {
    return NextResponse.json(
      { error: "invalid_body", message: "Send files as an array." },
      { status: 400 }
    );
  }

  const files = body.files as Array<{ path?: unknown; content?: unknown }>;
  const normalized = files
    .filter(
      (file) =>
        typeof file.path === "string" && typeof file.content === "string"
    )
    .map((file) => ({
      path: file.path as string,
      content: file.content as string,
    }));

  const capsError = checkExportCaps(normalized);
  if (capsError) {
    return NextResponse.json(
      { error: "invalid_body", message: capsError },
      { status: 400 }
    );
  }

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : slugifyRepoName("anvix-app");
  const nameError = validateRepoName(name);
  if (nameError) {
    return NextResponse.json(
      { error: "invalid_body", message: nameError },
      { status: 400 }
    );
  }

  try {
    const created = await createGitHubRepo(token, {
      name,
      description:
        typeof body.description === "string"
          ? body.description.slice(0, 350)
          : "Generated with ANVIX AI",
      isPrivate: body.private === true,
    });

    const pushed = await pushFilesToRepo(
      token,
      created.owner,
      created.repo,
      normalized,
      "Initial commit from ANVIX AI"
    );

    return NextResponse.json({
      repo: created.fullName,
      repo_url: created.htmlUrl,
      pushed: pushed.pushed,
      failed: pushed.failed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "github_error",
        message:
          error instanceof Error
            ? error.message
            : "GitHub refused the export.",
      },
      { status: 502 }
    );
  }
}

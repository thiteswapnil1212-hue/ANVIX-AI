import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAuthedCaller } from "@/lib/supabase/server-user";
import {
  GITHUB_MCP_SERVER_URL,
  isAllowedMcpServerUrl,
  listRemoteMcpTools,
} from "@/lib/mcp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/mcp/client/tools — list the tools of a remote MCP server.
 * Body: `{ serverUrl?: string, githubToken?: string }`.
 * `serverUrl` defaults to GitHub's MCP server. Only allow-listed hosts
 * are accepted (see lib/mcp/client.ts). The GitHub token is forwarded to
 * GitHub only, for this one request, and is never stored or logged.
 * Signed-in users only.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "mcp-client", 10, 60_000);
  if (limited) return limited;

  const caller = await getAuthedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to use remote MCP servers." },
      { status: 401 }
    );
  }

  let body: { serverUrl?: unknown; githubToken?: unknown };
  try {
    body = (await request.json()) as {
      serverUrl?: unknown;
      githubToken?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const serverUrl =
    typeof body.serverUrl === "string" && body.serverUrl.trim()
      ? body.serverUrl.trim()
      : GITHUB_MCP_SERVER_URL;
  const githubToken =
    typeof body.githubToken === "string" && body.githubToken.trim()
      ? body.githubToken.trim()
      : undefined;

  if (!isAllowedMcpServerUrl(serverUrl)) {
    return NextResponse.json(
      {
        error:
          "That MCP server is not allow-listed. Only GitHub's MCP server (api.githubcopilot.com) is supported.",
      },
      { status: 400 }
    );
  }

  const result = await listRemoteMcpTools(serverUrl, { githubToken });
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ serverUrl, tools: result.tools });
}

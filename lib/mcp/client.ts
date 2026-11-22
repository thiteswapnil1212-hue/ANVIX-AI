import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * ANVIX as an MCP client (stretch).
 *
 * The agent loop can ask a remote MCP server what tools it offers. The
 * first (and only allow-listed) server is GitHub's MCP server — the
 * obvious first outside tool for a code-building app. Other hosts are
 * refused: ANVIX must not become a generic proxy to arbitrary servers
 * with the user's tokens.
 *
 * The caller's GitHub token is passed per request and never stored or
 * logged. If GitHub's server rejects the token, the error is reported
 * honestly — there is no ANVIX-side GitHub account involved.
 */

export const ALLOWED_MCP_SERVER_HOSTS = [
  "api.githubcopilot.com", // GitHub's remote MCP server
] as const;

export const GITHUB_MCP_SERVER_URL =
  "https://api.githubcopilot.com/mcp/";

export interface RemoteMcpTool {
  name: string;
  description: string;
}

export type ListRemoteToolsResult =
  | { success: true; tools: RemoteMcpTool[] }
  | { success: false; error: string };

export function isAllowedMcpServerUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return (ALLOWED_MCP_SERVER_HOSTS as readonly string[]).includes(
    url.hostname
  );
}

/**
 * List the tools a remote MCP server offers. `githubToken` is sent as a
 * Bearer token to that server only. 15s timeout; always closes the client.
 */
export async function listRemoteMcpTools(
  serverUrl: string,
  options: { githubToken?: string; timeoutMs?: number } = {}
): Promise<ListRemoteToolsResult> {
  if (!isAllowedMcpServerUrl(serverUrl)) {
    return {
      success: false,
      error:
        "That MCP server is not allow-listed. Only GitHub's MCP server (api.githubcopilot.com) is supported.",
    };
  }

  const headers: Record<string, string> = {};
  if (options.githubToken) {
    headers.Authorization = `Bearer ${options.githubToken}`;
  }

  const timeoutMs = options.timeoutMs ?? 15_000;
  const client = new Client({ name: "anvix-ai", version: "0.1.0" });
  let transport: StreamableHTTPClientTransport;
  try {
    transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
      requestInit: {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      },
    });
    await client.connect(transport);
    const { tools } = await client.listTools();
    return {
      success: true,
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description ?? "",
      })),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not reach the MCP server.";
    return { success: false, error: message };
  } finally {
    await client.close().catch(() => undefined);
  }
}

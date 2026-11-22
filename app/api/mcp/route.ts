import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getAuthedCaller } from "@/lib/supabase/server-user";
import { getGoogleOAuthConfig } from "@/lib/google/oauth";
import { getValidAccessToken } from "@/lib/google/connections";
import { createAnvixMcpServer } from "@/lib/mcp/server";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * ANVIX as an MCP server — POST /api/mcp (Streamable HTTP, stateless).
 *
 * Auth (per user, required): a Supabase Bearer token for the caller's
 * ANVIX account. API-key auth (`X-API-Key`) is added by the public API
 * step; until then a Bearer token is the only way in. Unauthenticated
 * requests get 401, never a protocol error.
 *
 * A GET returns a plain-JSON description for humans (clients must POST).
 * Each POST creates a fresh server + stateless transport, handles the
 * one request, and closes — no session is kept between requests.
 */
export async function GET() {
  return NextResponse.json({
    name: "anvix-ai",
    version: "0.1.0",
    protocol: "MCP Streamable HTTP (stateless)",
    auth: "Authorization: Bearer <supabase access token>",
    tools: ["anvix_chat", "anvix_calendar_today", "anvix_calendar_create"],
    note: "MCP clients must POST JSON-RPC to this endpoint.",
  });
}

export async function POST(request: Request) {
  const caller = await getAuthedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Unauthorized: send a Supabase Bearer token." },
      { status: 401 }
    );
  }

  // Shared-quota guard: MCP calls burn the same Gemini key as chat.
  const { ok, retryAfterSeconds } = rateLimit(
    `mcp:user:${caller.userId}`,
    20,
    60_000
  );
  if (!ok) {
    return NextResponse.json(
      {
        error: "Too many requests. Please slow down and try again shortly.",
        retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  const config = getGoogleOAuthConfig();
  const server = createAnvixMcpServer({
    userId: caller.userId,
    getCalendarAccessToken: async () => {
      if (!config) return null;
      return getValidAccessToken(caller.client, caller.userId, config);
    },
  });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (error) {
    try {
      await transport.close();
    } catch {
      // already closed
    }
    const message =
      error instanceof Error ? error.message : "MCP request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

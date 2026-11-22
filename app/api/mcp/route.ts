import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getAuthedCaller } from "@/lib/supabase/server-user";
import { extractApiKey, verifyApiKey } from "@/lib/api-keys";
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
 * ANVIX account, or an ANVIX API key (`X-API-Key`). API-key callers can
 * use `anvix_chat`; the calendar tools need a signed-in session (their
 * Google connection lives under the user's Supabase login) and report
 * honestly that Calendar is not connected for key-based calls.
 * Unauthenticated requests get 401, never a protocol error.
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
  const bearerCaller = await getAuthedCaller(request);
  let userId: string | null = bearerCaller?.userId ?? null;
  if (!userId) {
    const candidate = extractApiKey(request);
    if (candidate) {
      const verified = await verifyApiKey(candidate);
      if (verified?.scopes.includes("chat")) userId = verified.userId;
    }
  }
  if (!userId) {
    return NextResponse.json(
      {
        error:
          "Unauthorized: send a Supabase Bearer token or an ANVIX API key (X-API-Key).",
      },
      { status: 401 }
    );
  }
  const caller = bearerCaller ?? null;

  // Shared-quota guard: MCP calls burn the same Gemini key as chat.
  const { ok, retryAfterSeconds } = rateLimit(
    `mcp:user:${userId}`,
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
    userId,
    getCalendarAccessToken: async () => {
      // Calendar needs the user's Supabase session; API-key callers
      // have none, so the calendar tools report "not connected".
      if (!config || !caller) return null;
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

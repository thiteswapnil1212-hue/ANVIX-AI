import { NextResponse } from "next/server";
import { getAuthedCaller } from "@/lib/supabase/server-user";
import { revokeApiKey } from "@/lib/api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/keys/:id/revoke — revoke one of the caller's keys.
 * Revocation takes effect immediately: the key's hash stays in the
 * table, but `verify_api_key` only returns non-revoked rows.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const caller = await getAuthedCaller(_request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to manage API keys." },
      { status: 401 }
    );
  }
  const revoked = await revokeApiKey(caller.client, caller.userId, id);
  if (!revoked) {
    return NextResponse.json(
      { error: "API key not found, already revoked, or not yours." },
      { status: 404 }
    );
  }
  return NextResponse.json({ revoked: true, id });
}

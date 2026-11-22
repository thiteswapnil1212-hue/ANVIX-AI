import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAuthedCaller } from "@/lib/supabase/server-user";
import { createApiKey, listApiKeys } from "@/lib/api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/keys — list the caller's API keys (prefixes, never hashes).
 * POST /api/v1/keys — create one. The plaintext key is returned exactly
 * once in the response; ANVIX cannot show it again afterwards.
 * Signed-in users only; the `api_keys` table must exist (schema.sql).
 */
export async function GET(request: Request) {
  const caller = await getAuthedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to manage API keys." },
      { status: 401 }
    );
  }
  const keys = await listApiKeys(caller.client, caller.userId);
  return NextResponse.json({
    keys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.keyPrefix,
      scopes: key.scopes,
      rateLimitPerMin: key.rateLimitPerMin,
      dailyCap: key.dailyCap,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      revokedAt: key.revokedAt,
    })),
  });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "api-keys", 10, 60_000);
  if (limited) return limited;

  const caller = await getAuthedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to manage API keys." },
      { status: 401 }
    );
  }

  let body: { name?: unknown } = {};
  try {
    body = (await request.json()) as { name?: unknown };
  } catch {
    // Empty body is fine — the key gets the default name.
  }
  const name = typeof body.name === "string" ? body.name : "";

  const created = await createApiKey(caller.client, caller.userId, name);
  if (!created.success) {
    return NextResponse.json({ error: created.error }, { status: 503 });
  }
  return NextResponse.json(
    {
      key: created.key,
      id: created.record.id,
      name: created.record.name,
      prefix: created.record.keyPrefix,
      scopes: created.record.scopes,
      rateLimitPerMin: created.record.rateLimitPerMin,
      dailyCap: created.record.dailyCap,
      warning:
        "Save this key now — it is shown only once and cannot be recovered.",
    },
    { status: 201 }
  );
}

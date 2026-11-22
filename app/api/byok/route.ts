import { NextResponse } from "next/server";

import {
  encryptApiKey,
  getByokEncryptionSecret,
  keyLast4,
} from "@/lib/byok/crypto";
import {
  fetchStoredByokKey,
  isValidGeminiKeyFormat,
  verifyGeminiKey,
} from "@/lib/byok/key-resolution";
import {
  createAuthedServerClient,
  getBearerToken,
  verifyAccessToken,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * BYOK management — `GET` status, `POST` save (verify first), `DELETE`
 * revoke. All server-side; the plaintext key is accepted here, verified
 * against Google, encrypted, and stored — it is never logged and never
 * sent back to the client. The client only ever sees `hasKey`,
 * `keyLast4` ("…wXYZ") and `verifiedAt`.
 *
 * Requires sign-in (a stored key belongs to a user) and a configured
 * `BYOK_ENCRYPTION_KEY`. Without the encryption secret the route says
 * so with a 503 instead of storing anything weakly. Without the
 * `user_api_keys` table (migration 0005_byok_keys.sql not run yet) it
 * also says so, instead of failing silently.
 */

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function requireUserId(request: Request): Promise<string | null> {
  const token = getBearerToken(request);
  if (!token) return null;
  return verifyAccessToken(token);
}

function isMissingTableError(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    /relation .* does not exist|Could not find the table/i.test(message)
  );
}

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) {
    return jsonError("Sign in to manage your API key.", 401);
  }

  const secret = getByokEncryptionSecret();
  const token = getBearerToken(request);
  const stored = await fetchStoredByokKey(userId, token);

  return NextResponse.json({
    provider: "gemini",
    encryptionConfigured: secret !== null,
    hasKey: stored !== null,
    keyLast4: stored?.keyLast4 ?? null,
    verifiedAt: stored?.verifiedAt ?? null,
  });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) {
    return jsonError("Sign in to save your own API key.", 401);
  }

  const secret = getByokEncryptionSecret();
  if (!secret) {
    return jsonError(
      "Your own key can't be stored on this deployment yet — the server's BYOK encryption is not configured. The shared key stays the default.",
      503
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const key =
    body && typeof body === "object" && "key" in body
      ? (body as { key: unknown }).key
      : undefined;
  if (typeof key !== "string" || !key.trim()) {
    return jsonError("Paste your Gemini API key first.", 400);
  }

  if (!isValidGeminiKeyFormat(key)) {
    return jsonError(
      "That doesn't look like a Gemini API key (it starts with AIza).",
      400
    );
  }

  const check = await verifyGeminiKey(key.trim());
  if (!check.valid) {
    return jsonError(check.error ?? "Google rejected this key.", 400);
  }

  let encrypted: string;
  try {
    encrypted = encryptApiKey(key.trim(), secret);
  } catch {
    return jsonError("Could not store the key. Please try again.", 500);
  }

  const token = getBearerToken(request);
  const client = createAuthedServerClient(token);
  if (!client) {
    return jsonError("Could not reach the database. Please try again.", 500);
  }

  const verifiedAt = new Date().toISOString();
  // Columns are the live `user_api_keys` shape from migration
  // 0005_byok_keys.sql (`key_hint`, `is_valid`, `last_validated_at`;
  // unique on (user_id, provider)).
  const { error } = await client.from("user_api_keys").upsert(
    {
      user_id: userId,
      provider: "gemini",
      encrypted_key: encrypted,
      key_hint: keyLast4(key),
      is_valid: true,
      last_validated_at: verifiedAt,
      updated_at: verifiedAt,
    },
    { onConflict: "user_id,provider" }
  );

  if (error) {
    if (isMissingTableError(error)) {
      return jsonError(
        "The BYOK tables have not been created in Supabase yet (migration 0005_byok_keys.sql). Your key was verified but not stored.",
        503
      );
    }
    console.error("[ANVIX BYOK] Failed to store key:", error);
    return jsonError("Could not store the key. Please try again.", 500);
  }

  return NextResponse.json({
    hasKey: true,
    keyLast4: keyLast4(key),
    verifiedAt,
  });
}

export async function DELETE(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) {
    return jsonError("Sign in to manage your API key.", 401);
  }

  const token = getBearerToken(request);
  const client = createAuthedServerClient(token);
  if (!client) {
    return jsonError("Could not reach the database. Please try again.", 500);
  }

  const { error } = await client
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId);

  if (error && !isMissingTableError(error)) {
    console.error("[ANVIX BYOK] Failed to revoke key:", error);
    return jsonError("Could not remove the key. Please try again.", 500);
  }

  return NextResponse.json({ hasKey: false });
}

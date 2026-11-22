import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  getAuthenticatedCaller,
  isMissingTableError,
} from "@/lib/notify/auth";
import {
  generateLinkCode,
  getTelegramBotUsername,
  isTelegramConfigured,
} from "@/lib/notify/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_TTL_MS = 10 * 60 * 1000;

/**
 * POST /api/notifications/telegram/link-code — mint a single-use,
 * 10-minute link code for the signed-in user. The user opens the bot and
 * sends `/start <code>`; the webhook consumes the code and links their
 * Telegram chat. 5 codes/minute per caller.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "telegram-link", 5, 60_000);
  if (limited) return limited;

  const caller = await getAuthenticatedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to link Telegram." },
      { status: 401 }
    );
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "Telegram notifications are not configured on this deployment — set TELEGRAM_BOT_TOKEN.",
      },
      { status: 503 }
    );
  }

  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  // Codes are random 8-char strings; a collision is near-impossible, but
  // retry twice rather than surfacing a 500 if one ever happens.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = generateLinkCode();
    const { error } = await caller.client
      .from("telegram_link_codes")
      .insert({
        code,
        user_id: caller.userId,
        expires_at: expiresAt,
      });
    if (!error) {
      return NextResponse.json({
        ok: true,
        code,
        expiresAt,
        botUsername: getTelegramBotUsername(),
      });
    }
    if (!isMissingTableError(error)) {
      // Unique-violation on the code itself: retry with a fresh code.
      if ((error as { code?: string }).code === "23505") continue;
      return NextResponse.json(
        { error: "Could not create a link code." },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error:
          "Telegram notifications are not set up on this deployment yet — run supabase/notifications.sql in the Supabase SQL editor.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { error: "Could not create a link code — please try again." },
    { status: 500 }
  );
}

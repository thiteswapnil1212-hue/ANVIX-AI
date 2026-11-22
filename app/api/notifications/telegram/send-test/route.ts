import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  getAuthenticatedCaller,
  isMissingTableError,
} from "@/lib/notify/auth";
import { isTelegramConfigured, sendTelegramToUser } from "@/lib/notify/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/telegram/send-test — send a test message to the
 * CALLER's own linked Telegram chat. Auth required, 5/minute.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "telegram-test", 5, 60_000);
  if (limited) return limited;

  const caller = await getAuthenticatedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to test Telegram notifications." },
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

  try {
    const result = await sendTelegramToUser(
      caller.client,
      caller.userId,
      "ANVIX test notification — Telegram notifications are working. Your task results and daily question can arrive here."
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, retryAfterSeconds: result.retryAfterSeconds },
        { status: result.retryAfterSeconds ? 429 : 400 }
      );
    }
    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (error) {
    if (isMissingTableError(error as { code?: string; message?: string })) {
      return NextResponse.json(
        {
          error:
            "Telegram notifications are not set up on this deployment yet — run supabase/notifications.sql in the Supabase SQL editor.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not send the Telegram test message." },
      { status: 500 }
    );
  }
}

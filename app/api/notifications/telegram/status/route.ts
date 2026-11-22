import { NextResponse } from "next/server";
import { getAuthenticatedCaller } from "@/lib/notify/auth";
import {
  getTelegramBotUsername,
  isTelegramConfigured,
} from "@/lib/notify/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/telegram/status — is the bot configured, and is
 * this user linked? Auth required.
 */
export async function GET(request: Request) {
  const caller = await getAuthenticatedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to manage Telegram notifications." },
      { status: 401 }
    );
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json({ configured: false, linked: false });
  }

  const { data } = await caller.client
    .from("telegram_links")
    .select("chat_id, chat_username, linked_at")
    .eq("user_id", caller.userId)
    .maybeSingle();

  const link = data as {
    chat_id: string;
    chat_username: string | null;
    linked_at: string;
  } | null;

  return NextResponse.json({
    configured: true,
    botUsername: getTelegramBotUsername(),
    linked: link !== null,
    chatUsername: link?.chat_username ?? null,
    linkedAt: link?.linked_at ?? null,
  });
}

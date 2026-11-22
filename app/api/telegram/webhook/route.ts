import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  isTelegramConfigured,
  parseTelegramStartCode,
  sendTelegramMessage,
} from "@/lib/notify/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/telegram/webhook — Telegram Bot API webhook.
 *
 * The deployer points the bot here once (see docs/notifications.md):
 *   POST https://api.telegram.org/bot<token>/setWebhook
 *   { "url": "https://<site>/api/telegram/webhook",
 *     "secret_token": "<TELEGRAM_WEBHOOK_SECRET>" }
 *
 * Security: when TELEGRAM_WEBHOOK_SECRET is set, calls without the
 * matching `X-Telegram-Bot-Api-Secret-Token` header are rejected — the
 * endpoint is otherwise callable by anyone who guesses the URL, and a
 * forged update must never be able to link an account. The link itself
 * goes through the SECURITY DEFINER `link_telegram_account()` RPC, which
 * only consumes a valid, unused, unexpired code; an invalid code links
 * nothing and the reply never says whether a code exists.
 *
 * Only private chats are linked — a code sent in a group would hand the
 * user's notifications to that group.
 */

interface TelegramChat {
  id: number;
  type?: string;
  username?: string;
}

interface TelegramMessage {
  chat?: TelegramChat;
  text?: string;
}

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  try {
    return createClient(url, anonKey);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "Telegram bot is not configured." },
      { status: 503 }
    );
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ error: "Forbidden." }, { status: 401 });
    }
  }

  let update: { message?: TelegramMessage };
  try {
    update = (await request.json()) as { message?: TelegramMessage };
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  const chat = message?.chat;
  const text = message?.text ?? "";
  if (!chat) return NextResponse.json({ ok: true });

  const chatId = String(chat.id);
  const chatUsername = chat.username ?? null;

  // Always answer 200: Telegram retries non-2xx deliveries, and a retry
  // storm helps nobody. Failures are reported to the user in-chat.
  if (chat.type !== "private") {
    return NextResponse.json({ ok: true });
  }

  if (text.trim() === "/unlink") {
    const client = getAnonClient();
    if (client) {
      await client.rpc("unlink_telegram_account", { p_chat_id: chatId });
    }
    await sendTelegramMessage(
      chatId,
      "Unlinked — ANVIX will no longer send you Telegram notifications. Link again anytime from Settings."
    );
    return NextResponse.json({ ok: true });
  }

  const code = parseTelegramStartCode(text);
  if (!code) {
    await sendTelegramMessage(
      chatId,
      "Hi, I'm the ANVIX notifications bot. To link your ANVIX account, go to Settings → Telegram in ANVIX, tap “Get link code”, and send me /start <code>."
    );
    return NextResponse.json({ ok: true });
  }

  const client = getAnonClient();
  if (!client) {
    await sendTelegramMessage(
      chatId,
      "ANVIX could not link your account right now — the server is not connected to its database. Please try again later."
    );
    return NextResponse.json({ ok: true });
  }

  const { data, error } = await client.rpc("link_telegram_account", {
    p_code: code,
    p_chat_id: chatId,
    p_chat_username: chatUsername,
  });

  if (error || !data) {
    await sendTelegramMessage(
      chatId,
      "That link code didn't work — it may be expired or already used. Get a fresh code from Settings → Telegram in ANVIX and try again."
    );
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(
    chatId,
    "Linked! ANVIX will send your task results and daily question here. Send /unlink anytime to stop."
  );
  return NextResponse.json({ ok: true });
}

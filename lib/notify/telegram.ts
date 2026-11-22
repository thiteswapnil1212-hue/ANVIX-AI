import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Telegram notifications — server side.
 *
 * Setup (all env, never in code):
 * - `TELEGRAM_BOT_TOKEN` — from @BotFather. Without it the feature
 *   reports itself as not configured.
 * - `TELEGRAM_BOT_USERNAME` — optional; when set, Settings shows a
 *   one-tap `t.me/<username>?start=<code>` link.
 * - `TELEGRAM_WEBHOOK_SECRET` — optional; when set, the webhook route
 *   rejects calls without the matching
 *   `X-Telegram-Bot-Api-Secret-Token` header.
 * - Webhook URL (set once, by the deployer, via the Bot API — see
 *   docs/notifications.md): `https://<site>/api/telegram/webhook`.
 *
 * Limits respected (Bot API guidelines): ~1 message/second per chat,
 * 4,096 characters per message. Long texts are chunked on newline
 * boundaries; a single over-long word is hard-split. A 429 from
 * Telegram is surfaced with its `retry_after` instead of retried
 * blindly.
 */

export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
/** Minimum gap between two messages to the same chat (Bot API guidance). */
const MIN_MS_BETWEEN_MESSAGES = 1_000;

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export function getTelegramBotUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME ?? null;
}

/** 8-character code from an unambiguous alphabet (no 0/O/1/I/l). */
export function generateLinkCode(randomInt?: (max: number) => number): string {
  const rand =
    randomInt ??
    ((max: number) => Math.floor(Math.random() * max));
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[rand(CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Split a message into ≤4096-char chunks, preferably on newlines.
 * Pure — unit-tested in telegram.test.ts.
 */
export function chunkTelegramMessage(
  text: string,
  maxLength: number = TELEGRAM_MAX_MESSAGE_LENGTH
): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > maxLength) {
    let cut = rest.lastIndexOf("\n", maxLength);
    if (cut <= 0) cut = maxLength;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/, "");
  }
  if (rest) chunks.push(rest);
  return chunks;
}

// Per-chat send throttle (in-memory; per server instance — see the
// rate-limit.ts header for why that is acceptable at this scale).
const lastSentAtByChat = new Map<string, number>();

async function waitForChatSlot(chatId: string): Promise<void> {
  const now = Date.now();
  const last = lastSentAtByChat.get(chatId) ?? 0;
  const waitMs = MIN_MS_BETWEEN_MESSAGES - (now - last);
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastSentAtByChat.set(chatId, Date.now());
}

export type TelegramSendResult =
  | { ok: true; messageId: number | null }
  | { ok: false; error: string; retryAfterSeconds?: number };

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  fetchImpl: typeof fetch = fetch
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "Telegram bot is not configured." };
  }

  await waitForChatSlot(chatId);

  let response: Response;
  try {
    response = await fetchImpl(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      }
    );
  } catch {
    return { ok: false, error: "Could not reach the Telegram API." };
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON error body — fall through to the status check below.
  }

  if (response.ok) {
    const messageId =
      (data as { result?: { message_id?: number } } | null)?.result
        ?.message_id ?? null;
    return { ok: true, messageId };
  }

  const body = data as {
    description?: string;
    parameters?: { retry_after?: number };
  } | null;
  if (response.status === 429) {
    return {
      ok: false,
      error: "Telegram rate limit — try again shortly.",
      retryAfterSeconds: body?.parameters?.retry_after,
    };
  }
  if (response.status === 403) {
    return {
      ok: false,
      error: "The bot was blocked or removed — unlink and link it again.",
    };
  }
  return {
    ok: false,
    error: body?.description ?? "Telegram could not send the message.",
  };
}

/** Send a (possibly long) message to a user's linked Telegram chat. */
export async function sendTelegramToUser(
  client: SupabaseClient,
  userId: string,
  text: string
): Promise<
  | { ok: true; sent: number }
  | { ok: false; error: string; retryAfterSeconds?: number }
> {
  const { data, error } = await client
    .from("telegram_links")
    .select("chat_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { ok: false, error: "Could not read the Telegram link." };
  if (!data) {
    return { ok: false, error: "No Telegram account is linked." };
  }

  const chatId = (data as { chat_id: string }).chat_id;
  let sent = 0;
  for (const chunk of chunkTelegramMessage(text)) {
    const result = await sendTelegramMessage(chatId, chunk);
    if (!result.ok) return result;
    sent += 1;
  }
  return { ok: true, sent };
}

/**
 * Parse a `/start <code>` (or `/start@BotName <code>`) message from the
 * bot. Returns the code, or null when the text is not a start-with-code.
 */
export function parseTelegramStartCode(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.trim().match(/^\/start(?:@\S+)?\s+([A-Za-z0-9]{8})$/);
  return match?.[1]?.toUpperCase() ?? null;
}

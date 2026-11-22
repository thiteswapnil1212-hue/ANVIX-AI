import { NextResponse } from "next/server";
import { getAuthenticatedCaller } from "@/lib/notify/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/telegram/unlink — remove the caller's Telegram
 * link. Auth required. The bot stops being able to reach them (it only
 * ever knew their chat id through the link row).
 */
export async function POST(request: Request) {
  const caller = await getAuthenticatedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to manage Telegram notifications." },
      { status: 401 }
    );
  }

  const { error } = await caller.client
    .from("telegram_links")
    .delete()
    .eq("user_id", caller.userId);

  if (error) {
    return NextResponse.json(
      { error: "Could not unlink Telegram." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getAuthenticatedCaller } from "@/lib/notify/auth";
import {
  RESEND_DAILY_LIMIT,
  dailyEmailCount,
  getEmailFrom,
  isEmailConfigured,
} from "@/lib/notify/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/email/status — is Resend configured, and how
 * much of today's free-tier allowance has this instance used? Auth
 * required (the count is deployment internals, not public).
 */
export async function GET(request: Request) {
  const caller = await getAuthenticatedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to manage email notifications." },
      { status: 401 }
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({
    configured: true,
    from: getEmailFrom(),
    dailyUsed: dailyEmailCount(),
    dailyLimit: RESEND_DAILY_LIMIT,
  });
}

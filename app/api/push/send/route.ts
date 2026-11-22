import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  getAuthenticatedCaller,
  isMissingTableError,
} from "@/lib/notify/auth";
import {
  isPushConfigured,
  parsePushPayload,
  sendPushToUser,
} from "@/lib/notify/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/push/send — send a push notification to the CALLER's own
 * subscriptions (test push today; task-result / Daily Question delivery
 * later, by calling `sendPushToUser` from those flows).
 *
 * Deliberately self-only: there is no "send to user X" parameter, so
 * this route can never be used to push to someone else. Auth required,
 * 10 sends/minute per caller.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "push-send", 10, 60_000);
  if (limited) return limited;

  const caller = await getAuthenticatedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to send push notifications." },
      { status: 401 }
    );
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "Push notifications are not configured on this deployment — set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = parsePushPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await sendPushToUser(
      caller.client,
      caller.userId,
      parsed.payload
    );
    return NextResponse.json({
      ok: true,
      ...result,
      message:
        result.sent === 0 && result.gone === 0
          ? "No push subscriptions found for this account — enable push in Settings first."
          : undefined,
    });
  } catch (error) {
    if (isMissingTableError(error as { code?: string; message?: string })) {
      return NextResponse.json(
        {
          error:
            "Push notifications are not set up on this deployment yet — run supabase/notifications.sql in the Supabase SQL editor.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not send the push notification." },
      { status: 500 }
    );
  }
}

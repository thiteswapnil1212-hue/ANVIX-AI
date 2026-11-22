import { NextResponse } from "next/server";
import {
  getAuthenticatedCaller,
  isMissingTableError,
} from "@/lib/notify/auth";
import { parsePushSubscription } from "@/lib/notify/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/push/subscribe — store this browser's push subscription for
 * the signed-in user. Auth required; the row is keyed by (user, endpoint)
 * so re-subscribing the same browser overwrites instead of duplicating.
 * A missing push_subscriptions table is a 503 with a setup hint, not a 500.
 */
export async function POST(request: Request) {
  const caller = await getAuthenticatedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to enable push notifications." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = parsePushSubscription(
    (body as Record<string, unknown> | null)?.subscription
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { error } = await caller.client.from("push_subscriptions").upsert(
    {
      user_id: caller.userId,
      endpoint: parsed.subscription.endpoint,
      p256dh: parsed.subscription.keys.p256dh,
      auth: parsed.subscription.keys.auth,
      user_agent: request.headers.get("user-agent") ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          error:
            "Push notifications are not set up on this deployment yet — run supabase/notifications.sql in the Supabase SQL editor.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not save the push subscription." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

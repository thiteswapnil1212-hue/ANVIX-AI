import { NextResponse } from "next/server";
import {
  getAuthenticatedCaller,
  isMissingTableError,
} from "@/lib/notify/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/push/unsubscribe — remove this browser's push subscription
 * for the signed-in user. The browser unsubscribes locally first (see
 * lib/notify/push-client.ts); this route removes the server-side row so
 * the user stops being sent pushes they can no longer receive.
 */
export async function POST(request: Request) {
  const caller = await getAuthenticatedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to manage push notifications." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const endpoint = (body as Record<string, unknown> | null)?.endpoint;
  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json(
      { error: "Request needs a subscription endpoint." },
      { status: 400 }
    );
  }

  const { error } = await caller.client
    .from("push_subscriptions")
    .delete()
    .eq("user_id", caller.userId)
    .eq("endpoint", endpoint);

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
      { error: "Could not remove the push subscription." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

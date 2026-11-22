import { NextResponse } from "next/server";

import { serviceSupabase } from "@/lib/supabase/server";
import { addShareReport, findLiveShare } from "@/lib/share/store";
import { isShareToken, validateReportReason } from "@/lib/share/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Report a shared link as abusive: POST /api/share/[token]/report
 *
 * Stores the reason for the share's owner (visible in their share
 * list) so they can revoke the link. Reports are not auto-actioned:
 * there is no moderator role in the app, so the owner is the one
 * who revokes. A report on an already-revoked link is a no-op
 * success — the harmful content is already unreachable.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!isShareToken(token)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!serviceSupabase) {
    return NextResponse.json(
      { error: "sharing_unavailable" },
      { status: 503 }
    );
  }

  let body: { reason?: unknown };
  try {
    body = (await req.json()) as { reason?: unknown };
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Send a JSON body with a reason." },
      { status: 400 }
    );
  }

  const reasonError = validateReportReason(body.reason);
  if (reasonError) {
    return NextResponse.json(
      { error: "invalid_body", message: reasonError },
      { status: 400 }
    );
  }

  const lookup = await findLiveShare(serviceSupabase, token);
  if (lookup.status === "unavailable") {
    return NextResponse.json({ error: "sharing_unavailable" }, { status: 503 });
  }
  if (lookup.status === "not_found") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (lookup.status === "revoked_or_expired") {
    // Already unreachable — report as received, nothing left to do.
    return NextResponse.json({ reported: true, already_revoked: true });
  }

  const saved = await addShareReport(serviceSupabase, {
    shareId: lookup.share.id,
    reason: String(body.reason),
  });

  if (!saved) {
    return NextResponse.json(
      { error: "sharing_unavailable", message: "Could not save the report." },
      { status: 503 }
    );
  }

  return NextResponse.json({ reported: true });
}

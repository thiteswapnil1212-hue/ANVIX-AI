import { NextResponse } from "next/server";

import { serviceSupabase } from "@/lib/supabase/server";
import { addShareComment, findLiveShare } from "@/lib/share/store";
import { isShareToken, validateCommentBody } from "@/lib/share/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Comment on a shared resource: POST /api/share/[token]/comments
 *
 * The share link IS the invite: anyone holding it may comment, but
 * only when the owner created the share with comment access
 * (permission = "comment"). A view-only share answers 403.
 * The author name comes from the request body (default "Guest");
 * signed-in commenters pass their display name from the client.
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

  let body: { name?: unknown; body?: unknown };
  try {
    body = (await req.json()) as { name?: unknown; body?: unknown };
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Send a JSON body with a comment." },
      { status: 400 }
    );
  }

  const bodyError = validateCommentBody(body.body);
  if (bodyError) {
    return NextResponse.json({ error: "invalid_body", message: bodyError }, { status: 400 });
  }

  const lookup = await findLiveShare(serviceSupabase, token);
  if (lookup.status === "unavailable") {
    return NextResponse.json({ error: "sharing_unavailable" }, { status: 503 });
  }
  if (lookup.status === "not_found") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (lookup.status === "revoked_or_expired") {
    return NextResponse.json({ error: "revoked_or_expired" }, { status: 410 });
  }

  if (lookup.share.permission !== "comment") {
    return NextResponse.json(
      {
        error: "comments_disabled",
        message: "The owner shared this read-only; comments are off.",
      },
      { status: 403 }
    );
  }

  const authorName =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 100)
      : "Guest";

  const comment = await addShareComment(serviceSupabase, {
    shareId: lookup.share.id,
    authorUserId: null,
    authorName,
    body: String(body.body),
  });

  if (!comment) {
    return NextResponse.json(
      { error: "sharing_unavailable", message: "Could not save the comment." },
      { status: 503 }
    );
  }

  return NextResponse.json({ comment }, { status: 201 });
}

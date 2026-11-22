import { NextResponse } from "next/server";

import { serviceSupabase } from "@/lib/supabase/server";
import {
  findLiveShare,
  listShareComments,
  loadSharedChat,
  loadSharedProject,
} from "@/lib/share/store";
import { isShareToken } from "@/lib/share/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public share read: GET /api/share/[token]
 *
 * Loads ONE shared chat or generated app by its unguessable token.
 * No auth needed — the token is the credential — and nothing else is
 * ever returned: the service-role client looks the share up by exact
 * token, then fetches only the single resource it points at.
 *
 * 503 sharing_unavailable: the server has no service-role key, or the
 * shares tables were never created (SQL not run). The public page
 * shows that honestly instead of a fake empty state.
 * 404: unknown token. 410: revoked or expired.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!isShareToken(token)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!serviceSupabase) {
    return NextResponse.json(
      {
        error: "sharing_unavailable",
        message:
          "Sharing is not set up on this deployment yet (server key or database tables missing).",
      },
      { status: 503 }
    );
  }

  const lookup = await findLiveShare(serviceSupabase, token);

  if (lookup.status === "unavailable") {
    return NextResponse.json(
      {
        error: "sharing_unavailable",
        message:
          "Sharing is not set up on this deployment yet (database tables missing).",
      },
      { status: 503 }
    );
  }
  if (lookup.status === "not_found") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (lookup.status === "revoked_or_expired") {
    return NextResponse.json(
      { error: "revoked_or_expired", message: "This share link was revoked or has expired." },
      { status: 410 }
    );
  }

  const { share } = lookup;

  const resource =
    share.resource_type === "chat"
      ? await loadSharedChat(serviceSupabase, share)
      : await loadSharedProject(serviceSupabase, share);

  if (!resource) {
    return NextResponse.json(
      { error: "not_found", message: "The shared item no longer exists." },
      { status: 404 }
    );
  }

  const comments = await listShareComments(serviceSupabase, share.id);

  return NextResponse.json({
    share: {
      resource_type: share.resource_type,
      permission: share.permission,
      expires_at: share.expires_at,
      created_at: share.created_at,
    },
    resource_type: share.resource_type,
    resource,
    comments: comments ?? [],
    comments_unavailable: comments === null,
  });
}

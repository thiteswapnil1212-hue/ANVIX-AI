import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAuthedServerContext } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/assistants/copy — copy a public assistant into your account.
 *
 * Body: { "shareToken": "<token from a share link>" }. The source must
 * be public (RLS only lets this read public rows); the copy is always
 * private, owned by the caller, with a fresh share token. Only the
 * owner can flip it public afterwards, from /assistants.
 */

export async function POST(request: Request) {
  const limited = await enforceRateLimit(
    request,
    "assistant-copy",
    20,
    3_600_000
  );
  if (limited) return limited;

  const authed = await getAuthedServerContext(request).catch(() => null);
  if (!authed) {
    return NextResponse.json(
      { error: "Sign in to copy an assistant." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const shareToken =
    typeof (body as Record<string, unknown>).shareToken === "string"
      ? ((body as Record<string, unknown>).shareToken as string).trim()
      : "";
  if (!shareToken) {
    return NextResponse.json(
      { error: "A share token is required." },
      { status: 400 }
    );
  }

  interface SourceRow {
    name: string;
    description: string;
    instructions: string;
    file_ids: unknown;
    tools_enabled: unknown;
    mode: string | null;
  }

  let source: SourceRow | null = null;

  try {
    const { data, error } = await authed.client
      .from("assistants")
      .select("name, description, instructions, file_ids, tools_enabled, mode")
      .eq("share_token", shareToken)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw error;
    source = (data ?? null) as SourceRow | null;
  } catch (error) {
    console.warn("Assistant copy failed while loading the source.", error);
    return NextResponse.json(
      { error: "Could not load that shared assistant." },
      { status: 500 }
    );
  }

  if (!source) {
    return NextResponse.json(
      { error: "No public assistant matches that link." },
      { status: 404 }
    );
  }

  try {
    const { data, error } = await authed.client
      .from("assistants")
      .insert({
        owner_id: authed.userId,
        name: source.name,
        description: source.description ?? "",
        instructions: source.instructions ?? "",
        file_ids: Array.isArray(source.file_ids) ? source.file_ids : [],
        tools_enabled: Array.isArray(source.tools_enabled)
          ? source.tools_enabled
          : ["web"],
        mode: source.mode,
        is_public: false,
      })
      .select("id, name")
      .single();
    if (error) throw error;

    return NextResponse.json(
      { id: (data as { id: string }).id, name: (data as { name: string }).name },
      { status: 201 }
    );
  } catch (error) {
    console.warn("Assistant copy failed while saving.", error);
    return NextResponse.json(
      { error: "Could not copy that assistant. Please try again." },
      { status: 500 }
    );
  }
}

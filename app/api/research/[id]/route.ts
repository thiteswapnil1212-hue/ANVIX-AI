import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";
import {
  applyResearchCancel,
  isResearchTerminal,
  type ResearchRun,
} from "@/lib/research";
import {
  authenticateResearchRequest,
  executeResearchStep,
  isMissingTableError,
  researchAuthError,
  researchRowToRun,
  researchRunToUpdate,
  RESEARCH_TABLE_MISSING_MESSAGE,
} from "@/lib/research-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadOwnRun(
  client: Awaited<ReturnType<typeof authenticateResearchRequest>>,
  id: string
): Promise<
  | { run: ResearchRun }
  | { error: ReturnType<typeof researchAuthError> }
> {
  if ("error" in client) return { error: client.error };
  const { data, error } = await client.client
    .from("research_runs")
    .select("*")
    .eq("id", id)
    .eq("user_id", client.userId)
    .single();

  if (error || !data) {
    if (error && isMissingTableError(error)) {
      return {
        error: researchAuthError(503, RESEARCH_TABLE_MISSING_MESSAGE),
      };
    }
    return { error: researchAuthError(404, "Research run not found.") };
  }
  return { run: researchRowToRun(data) };
}

async function persistRun(
  client: Awaited<ReturnType<typeof authenticateResearchRequest>>,
  run: ResearchRun
): Promise<ResearchRun> {
  if ("error" in client) return run;
  const { data, error } = await client.client
    .from("research_runs")
    .update(researchRunToUpdate(run))
    .eq("id", run.id)
    .eq("user_id", run.userId)
    .select("*")
    .single();
  if (error || !data) {
    console.error("Deep research persist failed:", error);
    return run;
  }
  return researchRowToRun(data);
}

/** GET /api/research/[id] — fetch one own run (for polling / reopening). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authenticateResearchRequest(request);
  if ("error" in auth) return auth.error;

  const loaded = await loadOwnRun(auth, id);
  if ("error" in loaded) return loaded.error;
  return NextResponse.json({ run: loaded.run });
}

/**
 * POST /api/research/[id] — one action per request:
 * - { action: "advance" }: run exactly ONE step (one short Gemini
 *   call), persist, return the run. The client polls this while the
 *   run is non-terminal; a run is never executed in one long call.
 * - { action: "cancel" }: mark a non-terminal run cancelled.
 * - { action: "steer", direction: "..." }: add/replace the steering
 *   note folded into the synthesize prompt (max 500 chars).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await enforceRateLimit(request, "research", 30, 60_000);
  if (limited) return limited;

  const { id } = await params;
  const auth = await authenticateResearchRequest(request);
  if ("error" in auth) return auth.error;

  let body: { action?: unknown; direction?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const loaded = await loadOwnRun(auth, id);
  if ("error" in loaded) return loaded.error;
  const run = loaded.run;

  if (body.action === "cancel") {
    if (isResearchTerminal(run.status)) {
      return NextResponse.json({ run });
    }
    return NextResponse.json({
      run: await persistRun(auth, applyResearchCancel(run)),
    });
  }

  if (body.action === "steer") {
    if (isResearchTerminal(run.status)) {
      return NextResponse.json(
        { error: "This run is finished and cannot be steered." },
        { status: 409 }
      );
    }
    if (
      typeof body.direction !== "string" ||
      !body.direction.trim() ||
      body.direction.trim().length > 500
    ) {
      return NextResponse.json(
        { error: "Direction must be 1–500 characters." },
        { status: 400 }
      );
    }
    const steered: ResearchRun = {
      ...run,
      direction: body.direction.trim(),
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json({ run: await persistRun(auth, steered) });
  }

  if (body.action === "advance") {
    if (isResearchTerminal(run.status)) {
      return NextResponse.json({ run });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return researchAuthError(500, "Gemini API key is not configured.");
    }
    const next = await executeResearchStep(run, apiKey);
    return NextResponse.json({ run: await persistRun(auth, next) });
  }

  return NextResponse.json(
    { error: "Unknown action. Use advance, cancel, or steer." },
    { status: 400 }
  );
}

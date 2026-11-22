import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";
import {
  authenticateResearchRequest,
  isMissingTableError,
  researchAuthError,
  researchRowToRun,
  RESEARCH_TABLE_MISSING_MESSAGE,
  startOfTodayUtc,
} from "@/lib/research-server";
import {
  canStartResearch,
  RESEARCH_DAILY_LIMIT,
  validateResearchQuestion,
} from "@/lib/research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/research — the user's recent runs, newest first. */
export async function GET(request: Request) {
  const auth = await authenticateResearchRequest(request);
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.client
    .from("research_runs")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    if (isMissingTableError(error)) {
      return researchAuthError(503, RESEARCH_TABLE_MISSING_MESSAGE);
    }
    console.error("Deep research list failed:", error);
    return researchAuthError(500, "Could not load research runs.");
  }

  return NextResponse.json({
    runs: (data ?? []).map(researchRowToRun),
  });
}

/** POST /api/research — start a run. 1/day/user, sign-in required. */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "research", 5, 60_000);
  if (limited) return limited;

  const auth = await authenticateResearchRequest(request);
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const validated = validateResearchQuestion(
    (body as { question?: unknown } | null)?.question
  );
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  // Daily cap: runs this user started since midnight UTC.
  const { data: today, error: countError } = await auth.client
    .from("research_runs")
    .select("id")
    .eq("user_id", auth.userId)
    .gte("created_at", startOfTodayUtc());

  if (countError) {
    if (isMissingTableError(countError)) {
      return researchAuthError(503, RESEARCH_TABLE_MISSING_MESSAGE);
    }
    console.error("Deep research cap check failed:", countError);
    return researchAuthError(500, "Could not start the research run.");
  }

  if (!canStartResearch(today?.length ?? 0)) {
    return NextResponse.json(
      {
        error: `Deep research is limited to ${RESEARCH_DAILY_LIMIT} run per day. Try again tomorrow.`,
      },
      { status: 429 }
    );
  }

  const { data, error } = await auth.client
    .from("research_runs")
    .insert({
      user_id: auth.userId,
      question: validated.question,
      status: "queued",
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error && isMissingTableError(error)) {
      return researchAuthError(503, RESEARCH_TABLE_MISSING_MESSAGE);
    }
    console.error("Deep research start failed:", error);
    return researchAuthError(500, "Could not start the research run.");
  }

  return NextResponse.json({ run: researchRowToRun(data) }, { status: 201 });
}

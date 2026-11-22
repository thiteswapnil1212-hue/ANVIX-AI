import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { thinkingConfig } from "./gemini/model-config.ts";
import {
  extractGroundingSources,
  groundingTools,
} from "./gemini/grounding.ts";
import {
  applyPlanResult,
  applyResearchFailure,
  applySearchResult,
  applySynthesizeResult,
  buildPlanPrompt,
  buildSearchPrompt,
  buildSynthesizePrompt,
  nextResearchStep,
  parsePlanResponse,
  RESEARCH_MAX_STEPS,
  RESEARCH_MODEL_ID,
  type ResearchRun,
  type ResearchStatus,
} from "./research.ts";

/**
 * Server side of scoped deep research: auth + Supabase row mapping +
 * the one-Gemini-call-per-advance step executor.
 *
 * Auth: research is sign-in only (quota-hostile, shared key). The
 * caller sends the same Bearer access token the chat route uses for
 * rate-limit keying; the Supabase client runs with that token so RLS
 * (`auth.uid() = user_id`) applies — the server never bypasses it.
 *
 * Missing table: if `research_runs` was never applied (see
 * `supabase/migrations/20261122_research_runs.sql`), Supabase
 * returns 42P01. Routes translate that into a 503 naming the file
 * instead of a 500 — research is unusable until the SQL is run,
 * everything else keeps working.
 */

export const RESEARCH_TABLE_MISSING_MESSAGE =
  "Deep research is not set up yet: the research_runs table is missing. " +
  "Run supabase/migrations/20261122_research_runs.sql in Supabase first.";

export type ResearchAuth =
  | { client: SupabaseClient; userId: string }
  | { error: Response };

export function researchAuthError(
  status: number,
  message: string
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Verify the request's Bearer token; null auth -> 401, no Supabase -> 503. */
export async function authenticateResearchRequest(
  request: Request
): Promise<ResearchAuth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return {
      error: researchAuthError(
        503,
        "Deep research needs Supabase configured on this deployment."
      ),
    };
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice("Bearer ".length).trim()
    : "";
  if (!token) {
    return {
      error: researchAuthError(
        401,
        "Sign in to use deep research — it is limited to 1 run per day per user."
      ),
    };
  }

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await client.auth.getUser(token);
    const userId = !error ? data.user?.id : null;
    if (!userId) {
      return { error: researchAuthError(401, "Sign-in expired. Please sign in again.") };
    }
    return { client, userId };
  } catch {
    return { error: researchAuthError(401, "Sign-in expired. Please sign in again.") };
  }
}

export function isMissingTableError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    (error as { code?: unknown }).code === "42P01"
  );
}

// ------------------------------------------------------------ row mapping

type ResearchRow = {
  id: string;
  user_id: string;
  question: string;
  status: ResearchStatus;
  plan: unknown;
  step_index: number;
  notes: unknown;
  sources: unknown;
  direction: string | null;
  report_markdown: string | null;
  error: string | null;
  steps_used: number;
  created_at: string;
  updated_at: string;
};

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function jsonSources(value: unknown): ResearchRun["sources"] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is { title: string; uri: string } =>
      !!item &&
      typeof item === "object" &&
      typeof (item as { title?: unknown }).title === "string" &&
      typeof (item as { uri?: unknown }).uri === "string"
  );
}

export function researchRowToRun(row: ResearchRow): ResearchRun {
  return {
    id: row.id,
    userId: row.user_id,
    question: row.question,
    status: row.status,
    plan: jsonStringArray(row.plan),
    stepIndex: row.step_index,
    notes: jsonStringArray(row.notes),
    sources: jsonSources(row.sources),
    direction: row.direction,
    reportMarkdown: row.report_markdown,
    error: row.error,
    stepsUsed: row.steps_used,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Columns to persist after a step transition. */
export function researchRunToUpdate(run: ResearchRun): Record<string, unknown> {
  return {
    status: run.status,
    plan: run.plan,
    step_index: run.stepIndex,
    notes: run.notes,
    sources: run.sources,
    direction: run.direction,
    report_markdown: run.reportMarkdown,
    error: run.error,
    steps_used: run.stepsUsed,
    updated_at: run.updatedAt,
  };
}

export function startOfTodayUtc(now = new Date()): string {
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  return day.toISOString();
}

// ------------------------------------------------------------ step executor

/** Run exactly one step of a run: one short Gemini call, then a pure transition. */
export async function executeResearchStep(
  run: ResearchRun,
  apiKey: string
): Promise<ResearchRun> {
  const step = nextResearchStep(run);
  if (!step) return run;

  if (run.stepsUsed >= RESEARCH_MAX_STEPS) {
    return applyResearchFailure(
      run,
      "Step budget exhausted (max 8 Gemini calls per run)."
    );
  }

  const client = new GoogleGenerativeAI(apiKey);

  try {
    if (step === "plan") {
      const model = client.getGenerativeModel({
        model: RESEARCH_MODEL_ID,
        generationConfig: { ...thinkingConfig("minimal") },
      });
      const result = await model.generateContent(
        buildPlanPrompt(run.question)
      );
      const plan = parsePlanResponse(result.response.text());
      return applyPlanResult({ ...run, status: "planning" }, plan);
    }

    if (step === "search") {
      const query = run.plan[run.stepIndex];
      if (!query) {
        return applyResearchFailure(run, "Plan ran out of queries.");
      }
      const model = client.getGenerativeModel({
        model: RESEARCH_MODEL_ID,
        generationConfig: { ...thinkingConfig("minimal") },
        tools: groundingTools(true),
      });
      const result = await model.generateContent(
        buildSearchPrompt(run.question, query, run.direction)
      );
      const notes = result.response.text();
      const sources = extractGroundingSources(result.response);
      return applySearchResult(
        { ...run, status: "searching" },
        notes,
        sources
      );
    }

    // synthesize
    const model = client.getGenerativeModel({
      model: RESEARCH_MODEL_ID,
      generationConfig: { ...thinkingConfig("minimal") },
    });
    const result = await model.generateContent(
      buildSynthesizePrompt({ ...run, status: "synthesizing" })
    );
    return applySynthesizeResult(
      { ...run, status: "synthesizing" },
      result.response.text()
    );
  } catch (error) {
    console.error("Deep research step failed:", error);
    return applyResearchFailure(
      run,
      "A research step failed. You can resume this run — advancing retries the step."
    );
  }
}

import type { GroundingSource } from "./gemini/grounding.ts";
import { mergeGroundingSources } from "./gemini/grounding.ts";
import { CHAT_MODEL_ID } from "./gemini/model-config.ts";

/**
 * Deep research mode — SCOPED version (report §5).
 *
 * The report's full design composes grounding (Wave 2, live) with the
 * agent loop (Wave 4) — but the agent loop does NOT exist in this
 * codebase, so there is nothing to reuse. This is the honest scoped
 * version instead: a deterministic state machine driven by short,
 * sequential grounded calls, with state in the `research_runs` table
 * (see `supabase/migrations/20261122_research_runs.sql`):
 *
 *   queued → planning → searching → synthesizing → done
 *                                        ↘ failed / cancelled
 *
 * - planning:     1 Flash-Lite call → 3–5 search queries (the plan).
 * - searching:    1 grounded Flash-Lite call per planned query
 *                 (max 5), each returning findings + sources.
 * - synthesizing: 1 Flash-Lite call → structured Markdown report
 *                 with [n] citations over the collected sources.
 *
 * Each step is exactly one short Gemini call, executed by one
 * `/api/research/[id]` advance request — a run is chunked across
 * requests because a single Vercel function caps at 300 s.
 *
 * Hard caps from day one (quota-hostile feature, shared key):
 * - 1 run / day / user (enforced at start time).
 * - Flash-Lite only (`RESEARCH_MODEL_ID`).
 * - Max ~15 sources, max 8 Gemini calls per run (1 plan + 5 search
 *   + 1 synthesize + 1 spare).
 * - Sign-in required (no guest runs).
 *
 * What this is NOT: there is no autonomous agent loop, no tool use,
 * no browsing beyond grounded search + URL context, no mid-run
 * replanning, and no background worker — the client polls `advance`
 * while the panel is open. A run left mid-way stays in its last
 * state and can be resumed by advancing again.
 */

export type ResearchStatus =
  | "queued"
  | "planning"
  | "searching"
  | "synthesizing"
  | "done"
  | "failed"
  | "cancelled";

export const RESEARCH_MODEL_ID = CHAT_MODEL_ID; // gemini-3.5-flash-lite
export const RESEARCH_DAILY_LIMIT = 1;
export const RESEARCH_MAX_SOURCES = 15;
export const RESEARCH_MAX_PLAN_QUERIES = 5;
export const RESEARCH_MAX_STEPS = 8;
export const RESEARCH_MIN_QUESTION_CHARS = 10;
export const RESEARCH_MAX_QUESTION_CHARS = 2000;

export type ResearchRun = {
  id: string;
  userId: string;
  question: string;
  status: ResearchStatus;
  /** Planned search queries, in order. */
  plan: string[];
  /** Index of the next planned query to search. */
  stepIndex: number;
  /** One findings note per completed search step, in plan order. */
  notes: string[];
  /** Grounded sources collected across search steps, deduped by uri. */
  sources: GroundingSource[];
  /** User steering note, folded into the synthesize prompt. */
  direction: string | null;
  reportMarkdown: string | null;
  error: string | null;
  stepsUsed: number;
  createdAt: string;
  updatedAt: string;
};

export const RESEARCH_TERMINAL_STATUSES: ResearchStatus[] = [
  "done",
  "failed",
  "cancelled",
];

export function isResearchTerminal(status: ResearchStatus): boolean {
  return RESEARCH_TERMINAL_STATUSES.includes(status);
}

export function validateResearchQuestion(
  value: unknown
): { ok: true; question: string } | { ok: false; error: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: "A research question is required." };
  }
  const question = value.trim();
  if (question.length < RESEARCH_MIN_QUESTION_CHARS) {
    return {
      ok: false,
      error: "Give a little more detail — at least 10 characters.",
    };
  }
  if (question.length > RESEARCH_MAX_QUESTION_CHARS) {
    return {
      ok: false,
      error: "Keep the question under 2000 characters.",
    };
  }
  return { ok: true, question };
}

/** Daily cap: how many runs the user already started today. */
export function canStartResearch(runsStartedToday: number): boolean {
  return runsStartedToday < RESEARCH_DAILY_LIMIT;
}

export type ResearchStep = "plan" | "search" | "synthesize";

/**
 * Which single step runs next for this run, or null when it is
 * terminal / has no work left. `queued` plans first; a run with a
 * plan still to search searches next; a fully-searched run
 * synthesizes.
 */
export function nextResearchStep(run: ResearchRun): ResearchStep | null {
  if (isResearchTerminal(run.status)) return null;
  if (run.status === "queued" || run.status === "planning") return "plan";
  if (run.status === "searching") {
    return run.stepIndex < run.plan.length ? "search" : "synthesize";
  }
  if (run.status === "synthesizing") return "synthesize";
  return null;
}

export type ResearchProgress = {
  /** Short label for the panel, e.g. "Searching 2 of 5". */
  label: string;
  /** Steps completed out of `total` (plan + searches + synthesize). */
  done: number;
  total: number;
};

export function researchProgress(run: ResearchRun): ResearchProgress {
  const total = 1 + run.plan.length + 1;
  switch (run.status) {
    case "queued":
      return { label: "Starting…", done: 0, total };
    case "planning":
      return { label: "Planning searches…", done: 0, total };
    case "searching":
      return {
        label: `Searching ${Math.min(run.stepIndex + 1, run.plan.length)} of ${run.plan.length}`,
        done: 1 + run.stepIndex,
        total,
      };
    case "synthesizing":
      return {
        label: "Writing the report…",
        done: 1 + run.plan.length,
        total,
      };
    case "done":
      return { label: "Done", done: total, total };
    case "failed":
      return { label: "Failed", done: 1 + run.stepIndex, total };
    case "cancelled":
      return { label: "Cancelled", done: 1 + run.stepIndex, total };
  }
}

// ------------------------------------------------------------ prompts

export function buildPlanPrompt(question: string): string {
  return (
    `You are planning a short research task. The user asked:\n\n${question}\n\n` +
    `Write ${RESEARCH_MAX_PLAN_QUERIES} distinct web search queries that together would answer it — ` +
    `cover different angles (facts, context, counterpoints, recent developments). ` +
    `Reply with ONLY a JSON array of strings, no other text.`
  );
}

export function buildSearchPrompt(
  question: string,
  query: string,
  direction: string | null
): string {
  return (
    `Research question: ${question}\n\n` +
    `Search for: ${query}\n\n` +
    (direction
      ? `User direction for this research: ${direction}\n\n`
      : "") +
    `Use web search and URL context. Summarize the key facts you found in ` +
    `5–8 bullet points, each grounded in the sources you read. Do not ` +
    `invent facts, dates, or figures — if a source does not state it, ` +
    `say so.`
  );
}

export function buildSynthesizePrompt(run: ResearchRun): string {
  const findings = run.notes
    .map((note, i) => `Findings for "${run.plan[i] ?? `query ${i + 1}`}"\n${note}`)
    .join("\n\n");
  const sourceLines = run.sources
    .map((source, i) => `[${i + 1}] ${source.title} — ${source.uri}`)
    .join("\n");
  return (
    `Write a structured research report answering this question:\n\n${run.question}\n\n` +
    (run.direction ? `User direction: ${run.direction}\n\n` : "") +
    `Use ONLY the findings below — do not add facts from your own knowledge. ` +
    `If the findings disagree or leave a gap, say so explicitly.\n\n${findings}\n\n` +
    `Cite sources inline as [n] using this numbered list:\n${sourceLines}\n\n` +
    `Format the report as Markdown: a one-paragraph summary, then headed ` +
    `sections, then a short "What is still unclear" section. Do NOT add ` +
    `a Sources section — it is appended automatically.`
  );
}

// ------------------------------------------------------------ transitions

/**
 * Parse the planner's reply into a plan. Accepts a JSON array of
 * strings, or a fallback of one query per non-empty line. Dedupes,
 * drops empties, caps at 5. Returns [] when nothing usable came back.
 */
export function parsePlanResponse(text: string): string[] {
  const clean = (items: unknown[]): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of items) {
      if (typeof item !== "string") continue;
      const query = item.trim().replace(/^[-*\d.)\s]+/, "").trim();
      if (!query || seen.has(query.toLowerCase())) continue;
      seen.add(query.toLowerCase());
      out.push(query);
      if (out.length >= RESEARCH_MAX_PLAN_QUERIES) break;
    }
    return out;
  };

  try {
    const parsed: unknown = JSON.parse(text.trim());
    if (Array.isArray(parsed)) {
      const plan = clean(parsed);
      if (plan.length > 0) return plan;
    }
  } catch {
    // Fall through to the line-list fallback.
  }

  return clean(text.split("\n"));
}

export function applyPlanResult(
  run: ResearchRun,
  plan: string[]
): ResearchRun {
  if (plan.length === 0) {
    return {
      ...run,
      status: "failed",
      error: "The planner returned no usable search queries.",
      stepsUsed: run.stepsUsed + 1,
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    ...run,
    status: "searching",
    plan,
    stepIndex: 0,
    stepsUsed: run.stepsUsed + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function applySearchResult(
  run: ResearchRun,
  notes: string,
  sources: GroundingSource[]
): ResearchRun {
  const merged = mergeGroundingSources(run.sources, sources).slice(
    0,
    RESEARCH_MAX_SOURCES
  );
  const nextIndex = run.stepIndex + 1;
  return {
    ...run,
    status:
      nextIndex < run.plan.length ? "searching" : "synthesizing",
    stepIndex: nextIndex,
    notes: [...run.notes, notes],
    sources: merged,
    stepsUsed: run.stepsUsed + 1,
    updatedAt: new Date().toISOString(),
  };
}

/** Append the numbered Sources section the synthesize prompt forbade. */
export function buildReportMarkdown(
  run: ResearchRun,
  reportBody: string
): string {
  const body = reportBody.trim();
  const sourceLines = run.sources
    .map(
      (source, i) =>
        `${i + 1}. [${source.title}](${source.uri})`
    )
    .join("\n");
  const sourcesSection = sourceLines
    ? `\n\n## Sources\n\n${sourceLines}\n`
    : `\n\n## Sources\n\nNo sources were collected for this report — treat its claims as unverified.\n`;
  return `${body}${sourcesSection}`;
}

export function applySynthesizeResult(
  run: ResearchRun,
  reportBody: string
): ResearchRun {
  return {
    ...run,
    status: "done",
    reportMarkdown: buildReportMarkdown(run, reportBody),
    stepsUsed: run.stepsUsed + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function applyResearchFailure(
  run: ResearchRun,
  message: string
): ResearchRun {
  return {
    ...run,
    status: "failed",
    error: message,
    stepsUsed: run.stepsUsed + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function applyResearchCancel(run: ResearchRun): ResearchRun {
  if (isResearchTerminal(run.status)) return run;
  return {
    ...run,
    status: "cancelled",
    updatedAt: new Date().toISOString(),
  };
}

/** Client-side Markdown export: the finished report, or null. */
export function researchReportExport(run: ResearchRun): string | null {
  return run.status === "done" ? run.reportMarkdown : null;
}

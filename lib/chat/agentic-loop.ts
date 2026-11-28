/**
 * Agentic loop for Deep mode (Wave 4 v1, 2026-11-28) — pure logic.
 *
 * Shape: PLAN → ACT (tool steps) → VERIFY → ANSWER. This module holds
 * everything that can be decided without calling a model: the step
 * budget, the time budget, the prompts, the JSON parsing, and the
 * verified-brief assembly. The actual Gemini calls live in
 * `agentic-loop-runner.ts`; the chat route wires the two together.
 *
 * Bounds (the loop must never cost the user their answer):
 * - At most 5 tool steps per request (`AGENTIC_LOOP_MAX_STEPS`).
 * - The loop's own calls must finish inside 40 s of loop start
 *   (`AGENTIC_LOOP_BUDGET_MS`): the route's `maxDuration` is 120 s,
 *   auth/context + a failed Groq phase cost ~10 s, and the final Deep
 *   stream needs the rest (Deep thinking alone runs 60–90 s live).
 *   On budget exhaustion the runner stops and the route falls back
 *   to the plain Deep answer — the loop never produces an error.
 * - Every internal call gets its own 15 s timeout
 *   (`AGENTIC_LOOP_STEP_TIMEOUT_MS`).
 * - Internal calls use Flash-Lite + `low` thinking with capped
 *   outputs (see the runner): the loop is scaffolding, the Deep
 *   model delivers the answer — the report's own mitigation is
 *   "use Flash-Lite for tool-call turns".
 *
 * Tool scope v1: web search (the existing grounding tools) and
 * Python code execution (the built-in `codeExecution` tool, see
 * `lib/gemini/code-execution.ts`). No other tools. Groq is untouched:
 * the loop runs only on the Gemini Deep path, after the Groq phase
 * has failed or been skipped — so with a Groq key configured, most
 * Deep requests never reach the loop.
 *
 * Honesty rules the loop keeps:
 * - The VERIFY pass checks SEARCH findings before the answer is
 *   written (a post-hoc pass would need the whole streamed answer
 *   buffered first — the same reason the reasoning-deep lane rejected
 *   a second verify call). A failed check discards the findings and
 *   falls back to the plain Deep answer.
 * - COMPUTE findings are verified by construction instead
 *   (verifyComputeFinding): code that ran successfully and printed
 *   a result using the question's own numbers IS verified. A model
 *   must never re-derive arithmetic — live 2026-11-28, the verify
 *   model (Flash-Lite) rejected a correct Python result for
 *   987654321 x 123456789 ("verify-rejected: ... incorrect (should
 *   be ...? No, let's check ..."), discarding a verified finding.
 * - A finding is only "verified" when the verify call says so in
 *   strict JSON; a malformed verify response is a fallback, never a
 *   silent pass. (Search findings only — see above.)
 * - Search findings carry their sources into the brief, and the
 *   runner returns the grounding sources so the route can emit them
 *   as the `sources` event — the "Grounded" badge only ever renders
 *   from real sources.
 */

import {
  isCodeExecutionOk,
  type CodeExecutionExtract,
} from "../gemini/code-execution.ts";

export const AGENTIC_LOOP_MAX_STEPS = 5;
export const AGENTIC_LOOP_BUDGET_MS = 40_000;
export const AGENTIC_LOOP_STEP_TIMEOUT_MS = 15_000;

/** Max chars kept from any one step finding in the brief. */
export const LOOP_FINDING_CAP = 2000;
/** Max chars of the whole verified brief fed to the final answer. */
export const LOOP_BRIEF_CAP = 3000;

export type LoopStepKind = "search" | "compute";

export type LoopStep = {
  kind: LoopStepKind;
  /** The sub-question (search) or the calculation task (compute). */
  query: string;
  /** Short human label shown in the Thinking block. */
  label: string;
};

export type LoopPlan = {
  direct: boolean;
  /** One-line plan summary ("" when direct). */
  summary: string;
  steps: LoopStep[];
};

export type LoopStepResult = {
  step: LoopStep;
  /** Finding text (search facts or compute output), capped. */
  finding: string;
  /** Present only for compute steps: the executed-code extract. */
  code?: CodeExecutionExtract;
};

export type LoopOutcome =
  | {
      outcome: "done";
      brief: string;
      stepsUsed: number;
    }
  | { outcome: "direct" }
  | { outcome: "fallback"; reason: string };

/** Milliseconds of loop budget left; <= 0 means the loop must stop. */
export function remainingLoopBudgetMs(
  startedAtMs: number,
  nowMs: number
): number {
  return AGENTIC_LOOP_BUDGET_MS - (nowMs - startedAtMs);
}

// --- Prompts ---------------------------------------------------------------

/**
 * The plan call. It decides whether the question needs live facts or
 * calculation at all — most questions are `direct`, and the loop costs
 * exactly one fast Lite call for those.
 *
 * Routing fix (loop-plan-fix, 2026-11-28): the old prompt asked the
 * planner to decide whether the question "needs live facts or
 * calculation, or can be answered directly from knowledge" — and
 * Flash-Lite resolved that vagueness to `direct` for every one of
 * the 5 live probes (including a 9-digit multiplication and a dated
 * Sensex question), so the loop never ran at all. The prompt now
 * flips the default: CHECK THE TRIGGERS FIRST — if any trigger
 * matches, steps are MANDATORY and `direct` is forbidden. `direct`
 * is only allowed when no trigger matches. The triggers are
 * concrete and checkable (digit counts, date words, "exact") so a
 * small planner can apply them mechanically instead of judging
 * "answerable from knowledge".
 */
export function buildPlanPrompt(
  prompt: string,
  webAvailable: boolean
): string {
  const webNote = webAvailable
    ? "Live web search IS available."
    : "Live web search is NOT available right now — do not plan search steps.";
  return (
    "You are ANVIX's research planner for a Deep-mode question. " +
    "Your job is to decide whether the question needs tool help (web search or Python calculation) or can be answered directly.\n\n" +
    `User question: ${prompt}\n\n${webNote}\n\n` +
    "CHECK THE TRIGGERS FIRST. If ANY trigger below matches, you MUST plan steps (\"direct\": false). " +
    "You may answer {\"direct\": true} ONLY when NO trigger matches.\n\n" +
    "COMPUTE triggers — plan a \"compute\" step, never answer direct:\n" +
    "- Exact arithmetic with any operand of 4 or more digits (for example 987654321 x 123456789, 17^6 + 23^4).\n" +
    "- Powers, products, factorials, combinations, or multi-step arithmetic where one wrong digit changes the answer.\n" +
    "- The question asks for an EXACT integer, a precise value, or to verify/check a calculation.\n" +
    "- Any arithmetic on numbers the user pasted in, or a word problem whose answer is a number that must be exact.\n\n" +
    "SEARCH triggers — plan a \"search\" step (only when web search is available):\n" +
    "- The question mentions a date, or the words current, latest, as of, today, recent, now, or a year.\n" +
    "- Prices, closing values, exchange rates, scores, or anything that changes day to day.\n" +
    "- Current office-holders, recent events, election results, or facts that change over time.\n\n" +
    "If a SEARCH trigger matches but web search is NOT available, do NOT plan a search step — plan a compute step only if a COMPUTE trigger also matches, otherwise answer direct.\n\n" +
    "DIRECT is allowed only when NO trigger matches — for example a single small fact from general knowledge, one-step mental arithmetic with operands under 4 digits, or an explanation, opinion, or how-to question.\n\n" +
    "Return ONLY a JSON object, no other text:\n" +
    '- If no trigger matches: {"direct": true}\n' +
    '- Otherwise: {"direct": false, "summary": "<one-line plan>", "steps": [{"kind": "search"|"compute", "query": "<sub-question or calculation>", "label": "<short label>"}]}\n' +
    "Rules: at most 5 steps; prefer \"search\" for current events, prices, dates, or facts that change; prefer \"compute\" for arithmetic, data analysis, or checking numbers; each step must be independently useful; never plan a step you cannot use."
  );
}

/** One search step: grounded generation, findings + sources. */
export function buildSearchStepPrompt(step: LoopStep, prompt: string): string {
  return (
    "Research this sub-question using web search and return the key facts in a few short lines, with the source name for each fact where available.\n\n" +
    `Sub-question: ${step.query}\nOriginal question: ${prompt}`
  );
}

/** One compute step: the model writes and runs Python itself. */
export function buildComputeStepPrompt(step: LoopStep, prompt: string): string {
  return (
    "Use Python code execution to work this out and return the result with the key numbers in a few short lines.\n\n" +
    `Task: ${step.query}\nOriginal question: ${prompt}`
  );
}

/**
 * The verify pass: one check over the SEARCH step results only. It
 * returns strict JSON — `ok: false` discards the findings (the route
 * falls back to the plain Deep answer), so a contradiction or a bad
 * fact never reaches the user dressed up as verified. Compute
 * findings are NEVER sent here: they are verified deterministically
 * by verifyComputeFinding instead (a model re-deriving arithmetic is
 * exactly what rejected a correct Python result live).
 */
export function buildVerifyPrompt(
  prompt: string,
  plan: LoopPlan,
  results: LoopStepResult[]
): string {
  const lines = results.map(
    (result, index) =>
      `${index + 1}. [${result.step.kind}] ${result.step.label}: ${result.finding}`
  );
  return (
    "You are ANVIX's verifier. Check the research below for the user's question. Flag any contradiction, failed calculation, or fact that does not answer the question.\n\n" +
    "Return ONLY a JSON object, no other text:\n" +
    '- If the research holds up: {"ok": true, "brief": "<verified facts in a few short lines — each with its source name or marked computed>"}\n' +
    '- If it does not: {"ok": false, "issue": "<one-line reason>"}\n\n' +
    `User question: ${prompt}\nPlan: ${plan.summary || "(direct)"}\nStep results:\n${lines.join("\n")}`
  );
}

// --- Parsing ---------------------------------------------------------------

function stripJsonCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

/**
 * Parse the plan call's JSON. Returns null when the model did not
 * return a usable plan — the caller treats that as a loop fallback
 * (plain Deep answer), never as a reason to fail the request.
 * More than 5 steps are capped to the first 5, never rejected.
 */
export function parseLoopPlan(text: string): LoopPlan | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonCodeFence(text));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  if (record.direct === true) {
    return { direct: true, summary: "", steps: [] };
  }
  if (record.direct !== false || !Array.isArray(record.steps)) {
    return null;
  }

  const steps: LoopStep[] = [];
  for (const raw of record.steps) {
    if (steps.length >= AGENTIC_LOOP_MAX_STEPS) break;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const candidate = raw as Record<string, unknown>;
    if (candidate.kind !== "search" && candidate.kind !== "compute") {
      continue;
    }
    const query = asNonEmptyString(candidate.query);
    if (!query) continue;
    const label =
      asNonEmptyString(candidate.label) ?? query.slice(0, 80);
    steps.push({ kind: candidate.kind, query, label });
  }
  if (steps.length === 0) return null;

  return {
    direct: false,
    summary: asNonEmptyString(record.summary)?.slice(0, 300) ?? "",
    steps,
  };
}

export type VerifyResult =
  | { ok: true; brief: string }
  | { ok: false; issue: string };

/**
 * Parse the verify call's strict JSON. Malformed JSON, a missing
 * brief, or any shape other than the two documented ones returns
 * null — the caller falls back to the plain Deep answer rather than
 * treating unverified text as verified.
 */
export function parseVerifyResult(text: string): VerifyResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonCodeFence(text));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  if (record.ok === true) {
    const brief = asNonEmptyString(record.brief);
    return brief ? { ok: true, brief } : null;
  }
  if (record.ok === false) {
    return {
      ok: false,
      issue: asNonEmptyString(record.issue) ?? "verification failed",
    };
  }
  return null;
}

export type ComputeVerification =
  | { ok: true }
  | { ok: false; issue: string };

/** Digit runs of 4+ digits, separators stripped ("987,654,321" -> "987654321"). */
function longDigitRuns(text: string): string[] {
  const runs = text.match(/[0-9][0-9_.,]*[0-9]|[0-9]/g) ?? [];
  return runs
    .map((run) => run.replace(/[^0-9]/g, ""))
    .filter((digits) => digits.length >= 4);
}

/**
 * Deterministic check for one compute finding — NO model call.
 *
 * Live defect (loop-verify-groq-fix, 2026-11-28): the verify model
 * (Flash-Lite, `low` thinking) rejected a correct Python result for
 * 987654321 x 123456789 — "verify-rejected: The calculated product
 * ... is incorrect (should be 121,932,631,112,635,269? No, let's
 * check ..." — and the finding was discarded. A weak model must
 * never re-derive arithmetic: code that ran successfully IS the
 * verification. This checks only what code can check:
 * 1. the code executed OK,
 * 2. it printed a result (non-empty output),
 * 3. the result is the right shape — a question with numbers must
 *    get an output with a number (a bare true/false/yes/no counts
 *    as a result for yes-no checks like divisibility),
 * 4. the code worked on the question's own numbers — at least one
 *    long (4+ digit) number from the question/step must appear in
 *    the executed code, so a computation of unrelated numbers fails.
 *    Decomposition is allowed: 987654321 x 123456789 computed as
 *    8*N*N + 9*N with N = 123456789 still contains 123456789.
 *    When the question has no long numbers this check is vacuous.
 * A failure here falls back to the plain Deep answer (fail safe:
 * a wrongly rejected verification only costs the loop's benefit,
 * a wrongly accepted one would ship a bad "verified" fact).
 */
export function verifyComputeFinding(
  question: string,
  step: LoopStep,
  code: CodeExecutionExtract
): ComputeVerification {
  if (!isCodeExecutionOk(code)) {
    return { ok: false, issue: "code did not execute successfully" };
  }
  if (!code.output.trim()) {
    return { ok: false, issue: "code ran but produced no output" };
  }
  const queryText = `${question}\n${step.query}`;
  const output = code.output;
  if (/\d/.test(queryText)) {
    const hasNumber = /\d/.test(output);
    const isBareBoolean = /^(true|false|yes|no)\s*$/i.test(output.trim());
    if (!hasNumber && !isBareBoolean) {
      return {
        ok: false,
        issue: "numeric question but the output has no number",
      };
    }
  }
  const longNumbers = longDigitRuns(queryText);
  if (longNumbers.length > 0) {
    const codeNumbers = new Set(longDigitRuns(code.code));
    const usedQuestionNumbers = longNumbers.some((n) =>
      codeNumbers.has(n)
    );
    if (!usedQuestionNumbers) {
      return {
        ok: false,
        issue: "code did not use the question's numbers",
      };
    }
  }
  return { ok: true };
}

/**
 * Deterministic brief for compute findings: they are already
 * verified by construction (see verifyComputeFinding), so no model
 * call is needed to write this — join the capped findings (each
 * already carries its "[Executed Python — outcome: OUTCOME_OK]"
 * line) and cap the whole brief.
 */
export function buildComputeBrief(results: LoopStepResult[]): string {
  return results
    .map((result) => result.finding)
    .join("\n")
    .slice(0, LOOP_BRIEF_CAP);
}

// --- Brief + thinking text -------------------------------------------------

/**
 * The system-prompt addition for the final answer call: the verified
 * brief, capped. The final answer still reasons (Deep prompt) — the
 * brief is checked context, not a pre-written answer.
 */
export function buildLoopContext(brief: string): string {
  const capped = brief.slice(0, LOOP_BRIEF_CAP);
  return (
    "Verified research for this question — checked before answering. " +
    "Use these facts; if they contradict your own knowledge, prefer " +
    "them and say so:\n" +
    capped
  );
}

/** Thinking-block line for the plan (emitted only when steps exist). */
export function planThinkingText(plan: LoopPlan): string {
  const stepList = plan.steps
    .map(
      (step) =>
        `${step.kind === "search" ? "search" : "calculate"}: ${step.label}`
    )
    .join("; ");
  return `Plan (${plan.steps.length} step${plan.steps.length === 1 ? "" : "s"}): ${stepList}`;
}

/** Thinking-block line for one tool step. */
export function stepThinkingText(
  step: LoopStep,
  index: number,
  total: number
): string {
  const verb =
    step.kind === "search" ? "Searching the web" : "Running Python";
  return `Step ${index + 1}/${total}: ${verb} — ${step.label}`;
}

/** Thinking-block line for the verify pass. */
export function verifyThinkingText(): string {
  return "Verifying the results before answering…";
}

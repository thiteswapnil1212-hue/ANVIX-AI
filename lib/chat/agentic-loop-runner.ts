import type { GroundingSource } from "../gemini/grounding.ts";
import {
  formatCodeExecutionFinding,
  isCodeExecutionOk,
  type CodeExecutionExtract,
} from "../gemini/code-execution.ts";
import {
  AGENTIC_LOOP_BUDGET_MS,
  AGENTIC_LOOP_STEP_TIMEOUT_MS,
  LOOP_FINDING_CAP,
  buildComputeBrief,
  buildComputeStepPrompt,
  buildPlanPrompt,
  buildSearchStepPrompt,
  buildVerifyPrompt,
  parseLoopPlan,
  parseVerifyResult,
  planThinkingText,
  stepThinkingText,
  verifyComputeFinding,
  verifyThinkingText,
  type LoopStep,
  type LoopStepResult,
} from "./agentic-loop.ts";

/**
 * Agentic-loop runner (Wave 4 v1) — orchestration only.
 *
 * The runner never touches the Gemini SDK: it calls the injected
 * `generate` (the chat route's adapter, which builds the model with
 * Flash-Lite + `low` thinking + capped outputs and extracts text,
 * grounding sources, and code-execution results from the raw
 * response). That keeps this file unit-testable with a fake
 * `generate` and keeps every provider detail in the route.
 *
 * Failure semantics (same as the Groq→Gemini fallback): ANY loop
 * failure — plan unparseable, a step throwing/timing out, a compute
 * step that never executed code, a failed verify — returns
 * `{ outcome: "fallback" }` and the route runs the plain Deep answer.
 * The user never sees a loop error. Thinking events already emitted
 * stay visible (they describe real work that happened); a plan that
 * fails before any step emits nothing at all.
 */

export type LoopTools = "none" | "grounding" | "code";

export type LoopGenerateInput = {
  prompt: string;
  tools: LoopTools;
  signal: AbortSignal;
};

export type LoopGenerateResult = {
  text: string;
  sources: GroundingSource[];
  /** Present only for `code` calls (the execution result parts). */
  code?: CodeExecutionExtract;
};

export type LoopGenerate = (
  input: LoopGenerateInput
) => Promise<LoopGenerateResult>;

export type LoopRunnerInput = {
  prompt: string;
  /** False when web is OFF or the grounding quota is cooling down. */
  webAvailable: boolean;
  generate: LoopGenerate;
  /** The request signal — a client disconnect aborts the loop. */
  signal: AbortSignal;
  /** Thinking-block narration (the route's loop emitter). */
  onThinking?: (text: string) => void;
  /** Test seams — production always uses the constants. */
  now?: () => number;
  budgetMs?: number;
  stepTimeoutMs?: number;
};

export type LoopRunResult =
  | {
      outcome: "done";
      brief: string;
      sources: GroundingSource[];
      stepsUsed: number;
    }
  | { outcome: "direct" }
  | { outcome: "fallback"; reason: string };

function capFinding(text: string): string {
  return text.slice(0, LOOP_FINDING_CAP);
}

export async function runAgenticLoop(
  input: LoopRunnerInput
): Promise<LoopRunResult> {
  const now = input.now ?? Date.now;
  const budgetMs = input.budgetMs ?? AGENTIC_LOOP_BUDGET_MS;
  const stepTimeoutMs =
    input.stepTimeoutMs ?? AGENTIC_LOOP_STEP_TIMEOUT_MS;
  const startedAt = now();
  const remaining = () => budgetMs - (now() - startedAt);

  // One generation with its own timeout, aborted early on a client
  // disconnect. The timeout RACES the call (agent.ts withTimeout
  // pattern) instead of relying on the signal alone: a callee that
  // ignores its signal must not hang the loop — the race moves on
  // and the abort still tells the provider call to stop.
  const callWithTimeout = async (
    call: Omit<LoopGenerateInput, "signal">
  ): Promise<LoopGenerateResult> => {
    const timeoutMs = Math.max(0, Math.min(stepTimeoutMs, remaining()));
    const ac = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        ac.abort();
        reject(new Error("Agentic loop step timed out"));
      }, timeoutMs);
    });
    const onOuterAbort = () => ac.abort();
    input.signal.addEventListener("abort", onOuterAbort, { once: true });
    try {
      return await Promise.race([
        input.generate({ ...call, signal: ac.signal }),
        timeoutPromise,
      ]);
    } finally {
      clearTimeout(timer!);
      input.signal.removeEventListener("abort", onOuterAbort);
    }
  };

  // --- PLAN ---------------------------------------------------------------
  let planText: string;
  try {
    planText = (
      await callWithTimeout({
        prompt: buildPlanPrompt(input.prompt, input.webAvailable),
        tools: "none",
      })
    ).text;
  } catch {
    return { outcome: "fallback", reason: "plan-call-failed" };
  }

  const plan = parseLoopPlan(planText);
  if (!plan) {
    return { outcome: "fallback", reason: "plan-unparseable" };
  }
  if (plan.direct) {
    return { outcome: "direct" };
  }

  input.onThinking?.(planThinkingText(plan));

  // --- ACT ------------------------------------------------------------------
  const results: LoopStepResult[] = [];
  const allSources: GroundingSource[] = [];
  const seenUris = new Set<string>();

  for (let index = 0; index < plan.steps.length; index++) {
    const step: LoopStep = plan.steps[index];
    if (remaining() <= 0) {
      return { outcome: "fallback", reason: "budget-exceeded" };
    }
    input.onThinking?.(stepThinkingText(step, index, plan.steps.length));

    let generated: LoopGenerateResult;
    try {
      generated = await callWithTimeout({
        prompt:
          step.kind === "search"
            ? buildSearchStepPrompt(step, input.prompt)
            : buildComputeStepPrompt(step, input.prompt),
        tools: step.kind === "search" ? "grounding" : "code",
      });
    } catch {
      return { outcome: "fallback", reason: `step-failed:${step.kind}` };
    }

    if (step.kind === "compute") {
      // A compute step only counts when code actually ran
      // successfully — a text-only answer is not a verified
      // calculation, and passing it off as one would be dishonest.
      if (!generated.code || !isCodeExecutionOk(generated.code)) {
        return { outcome: "fallback", reason: "compute-not-executed" };
      }
      const finding = capFinding(
        [generated.text, formatCodeExecutionFinding(generated.code)]
          .filter(Boolean)
          .join("\n")
      );
      if (!finding.trim()) {
        return { outcome: "fallback", reason: "step-empty:compute" };
      }
      results.push({ step, finding, code: generated.code });
      continue;
    }

    // Search step: narration + source list (the brief cites them,
    // and the route emits the sources event from `allSources`).
    for (const source of generated.sources) {
      if (seenUris.has(source.uri)) continue;
      seenUris.add(source.uri);
      allSources.push(source);
    }
    const sourceLine =
      generated.sources.length > 0
        ? `\nSources: ${generated.sources
            .map((source) => `${source.title} (${source.uri})`)
            .join(", ")}`
        : "";
    const finding = capFinding(`${generated.text}${sourceLine}`);
    if (!finding.trim()) {
      return { outcome: "fallback", reason: "step-empty:search" };
    }
    results.push({ step, finding });
  }

  // --- VERIFY ---------------------------------------------------------------
  // Compute findings are verified by construction (see
  // verifyComputeFinding): code that ran successfully and printed a
  // result using the question's own numbers IS verified — a model
  // must never re-derive arithmetic (live 2026-11-28, the verify
  // model rejected a correct Python result for 987654321 x
  // 123456789). Only search findings go to the model verify call.
  const searchResults = results.filter((r) => r.step.kind === "search");
  const computeResults = results.filter(
    (r) => r.step.kind === "compute"
  );

  for (const result of computeResults) {
    if (!result.code) {
      return {
        outcome: "fallback",
        reason: "compute-unverified:no code extract",
      };
    }
    const checked = verifyComputeFinding(
      input.prompt,
      result.step,
      result.code
    );
    if (!checked.ok) {
      return {
        outcome: "fallback",
        reason: `compute-unverified:${checked.issue.slice(0, 120)}`,
      };
    }
  }

  let searchBrief = "";
  if (searchResults.length > 0) {
    if (remaining() <= 0) {
      return { outcome: "fallback", reason: "budget-exceeded" };
    }
    input.onThinking?.(verifyThinkingText());

    let verifyText: string;
    try {
      verifyText = (
        await callWithTimeout({
          prompt: buildVerifyPrompt(input.prompt, plan, searchResults),
          tools: "none",
        })
      ).text;
    } catch {
      return { outcome: "fallback", reason: "verify-call-failed" };
    }

    const verified = parseVerifyResult(verifyText);
    if (!verified) {
      return { outcome: "fallback", reason: "verify-unparseable" };
    }
    if (!verified.ok) {
      return {
        outcome: "fallback",
        reason: `verify-rejected:${verified.issue.slice(0, 120)}`,
      };
    }
    searchBrief = verified.brief;
  }

  const brief = [searchBrief, buildComputeBrief(computeResults)]
    .filter(Boolean)
    .join("\n");

  return {
    outcome: "done",
    brief,
    sources: allSources,
    stepsUsed: results.length,
  };
}

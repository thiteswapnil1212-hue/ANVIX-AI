import test from "node:test";
import assert from "node:assert/strict";

import {
  AGENTIC_LOOP_BUDGET_MS,
  AGENTIC_LOOP_MAX_STEPS,
  buildLoopContext,
  buildPlanPrompt,
  buildSearchStepPrompt,
  buildComputeStepPrompt,
  buildVerifyPrompt,
  parseLoopPlan,
  parseVerifyResult,
  planThinkingText,
  remainingLoopBudgetMs,
  stepThinkingText,
  verifyThinkingText,
  type LoopPlan,
  type LoopStepResult,
} from "./agentic-loop.ts";

const SAMPLE_PLAN: LoopPlan = {
  direct: false,
  summary: "Check the price, then compute the total.",
  steps: [
    { kind: "search", query: "current gold price", label: "gold price" },
    { kind: "compute", query: "10g * price", label: "total cost" },
  ],
};

const SAMPLE_RESULTS: LoopStepResult[] = [
  { step: SAMPLE_PLAN.steps[0], finding: "Gold $2,600/oz (Reuters)." },
  { step: SAMPLE_PLAN.steps[1], finding: "10g = $835.20 (computed)." },
];

test("parseLoopPlan accepts a direct plan", () => {
  assert.deepEqual(parseLoopPlan('{"direct": true}'), {
    direct: true,
    summary: "",
    steps: [],
  });
});

test("parseLoopPlan accepts steps, tolerates a json fence", () => {
  const plan = parseLoopPlan(
    "```json\n" +
      JSON.stringify({
        direct: false,
        summary: "Check the price, then compute the total.",
        steps: [
          {
            kind: "search",
            query: "current gold price",
            label: "gold price",
          },
          { kind: "compute", query: "10g * price", label: "total cost" },
        ],
      }) +
      "\n```"
  );
  assert.deepEqual(plan, SAMPLE_PLAN);
});

test("parseLoopPlan caps steps at the max and drops bad ones", () => {
  const steps = Array.from({ length: 8 }, (_, i) => ({
    kind: i === 2 ? "browse" : "search",
    query: `q${i}`,
    label: `s${i}`,
  }));
  const plan = parseLoopPlan(
    JSON.stringify({ direct: false, summary: "s", steps })
  );
  // The bad-kind step is dropped; the first 5 valid ones are kept.
  assert.equal(plan?.steps.length, AGENTIC_LOOP_MAX_STEPS);
  assert.equal(plan?.steps[0].query, "q0");
  assert.equal(plan?.steps[4].query, "q5");
});

test("parseLoopPlan returns null for malformed or empty plans", () => {
  assert.equal(parseLoopPlan("not json"), null);
  assert.equal(parseLoopPlan('{"direct": false}'), null);
  assert.equal(parseLoopPlan('{"direct": false, "steps": []}'), null);
  assert.equal(
    parseLoopPlan(
      '{"direct": false, "steps": [{"kind": "search", "query": "  "}]}'
    ),
    null
  );
});

test("parseLoopPlan falls back to the query as the label", () => {
  const plan = parseLoopPlan(
    '{"direct": false, "steps": [{"kind": "compute", "query": "2+2"}]}'
  );
  assert.equal(plan?.steps[0].label, "2+2");
});

test("parseVerifyResult accepts ok + brief, and ok false + issue", () => {
  assert.deepEqual(
    parseVerifyResult('{"ok": true, "brief": "Gold $2,600/oz."}'),
    { ok: true, brief: "Gold $2,600/oz." }
  );
  assert.deepEqual(
    parseVerifyResult('{"ok": false, "issue": "sources disagree"}'),
    { ok: false, issue: "sources disagree" }
  );
});

test("parseVerifyResult returns null for malformed verify output", () => {
  assert.equal(parseVerifyResult("looks fine to me"), null);
  assert.equal(parseVerifyResult('{"ok": true}'), null);
  assert.equal(parseVerifyResult('{"ok": true, "brief": "   "}'), null);
  assert.equal(parseVerifyResult('{"ok": "yes"}'), null);
});

test("plan prompt tells the model when search is unavailable", () => {
  assert.match(buildPlanPrompt("hi", true), /IS available/);
  assert.match(
    buildPlanPrompt("hi", false),
    /NOT available right now — do not plan search steps/
  );
});

test("plan prompt routes large arithmetic to compute, never direct", () => {
  // Loop-plan-fix (2026-11-28): the old prompt's "answerable from
  // knowledge" wording let Flash-Lite return direct for a 9-digit
  // multiplication live. The prompt must now state the compute
  // triggers as mandatory rules with a concrete digit threshold.
  const prompt = buildPlanPrompt("987654321 x 123456789", true);
  assert.match(prompt, /CHECK THE TRIGGERS FIRST/);
  assert.match(prompt, /MUST plan steps/);
  assert.match(prompt, /4 or more digits/);
  assert.match(prompt, /plan a "compute" step, never answer direct/);
  assert.match(prompt, /EXACT integer/);
});

test("plan prompt routes dated and live facts to search", () => {
  const prompt = buildPlanPrompt("Sensex close 27 Nov 2026", true);
  assert.match(prompt, /SEARCH triggers/);
  assert.match(prompt, /current, latest, as of, today, recent, now/);
  assert.match(prompt, /closing values/);
  assert.match(prompt, /facts that change over time/);
});

test("plan prompt forbids direct when a trigger matches, and keeps it only when none does", () => {
  const prompt = buildPlanPrompt("hi", true);
  assert.match(
    prompt,
    /You may answer \{"direct": true\} ONLY when NO trigger matches/
  );
  assert.match(
    prompt,
    /DIRECT is allowed only when NO trigger matches/
  );
  // Search triggers must not fire when web is unavailable — the
  // plan falls back to compute-or-direct instead of planning a
  // search it cannot run.
  assert.match(
    buildPlanPrompt("hi", false),
    /If a SEARCH trigger matches but web search is NOT available, do NOT plan a search step/
  );
});

test("step and verify prompts carry the question and the results", () => {
  assert.match(buildSearchStepPrompt(SAMPLE_PLAN.steps[0], "q"), /gold price/);
  assert.match(
    buildComputeStepPrompt(SAMPLE_PLAN.steps[1], "q"),
    /Python code execution/
  );
  const verify = buildVerifyPrompt("q", SAMPLE_PLAN, SAMPLE_RESULTS);
  assert.match(verify, /Reuters/);
  assert.match(verify, /computed/);
  assert.match(verify, /"ok": true/);
});

test("buildLoopContext caps the brief and marks it verified", () => {
  const context = buildLoopContext("x".repeat(5000));
  assert.match(context, /Verified research/);
  assert.match(context, /prefer them and say so/);
  assert.ok(context.length < 5000);
});

test("thinking text names the plan, the step, and the verify pass", () => {
  assert.match(planThinkingText(SAMPLE_PLAN), /Plan \(2 steps\)/);
  assert.match(planThinkingText(SAMPLE_PLAN), /search: gold price/);
  assert.match(planThinkingText(SAMPLE_PLAN), /calculate: total cost/);
  assert.equal(
    stepThinkingText(SAMPLE_PLAN.steps[0], 0, 2),
    "Step 1/2: Searching the web — gold price"
  );
  assert.equal(
    stepThinkingText(SAMPLE_PLAN.steps[1], 1, 2),
    "Step 2/2: Running Python — total cost"
  );
  assert.match(verifyThinkingText(), /Verifying/);
});

test("remainingLoopBudgetMs counts down from the 40 s budget", () => {
  assert.equal(remainingLoopBudgetMs(1000, 1000), AGENTIC_LOOP_BUDGET_MS);
  assert.equal(remainingLoopBudgetMs(1000, 21000), 20000);
  assert.ok(remainingLoopBudgetMs(1000, 1000 + AGENTIC_LOOP_BUDGET_MS) <= 0);
});

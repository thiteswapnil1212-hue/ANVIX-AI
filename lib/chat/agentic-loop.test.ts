import test from "node:test";
import assert from "node:assert/strict";

import {
  AGENTIC_LOOP_BUDGET_MS,
  AGENTIC_LOOP_MAX_STEPS,
  buildComputeBrief,
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
  verifyComputeFinding,
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

test("verifyComputeFinding accepts the live big-multiplication result", () => {
  // Loop-verify-groq-fix (2026-11-28): the verify MODEL rejected
  // this exact correct Python result live ("verify-rejected: ...
  // incorrect (should be 121,932,631,112,635,269? No, let's
  // check ..."). The deterministic check must accept it: code ran
  // OK, printed the number, and used the question's numbers.
  const checked = verifyComputeFinding(
    "Multiply 987654321 by 123456789 exactly and give the full integer result.",
    {
      kind: "compute",
      query: "987654321 * 123456789",
      label: "exact_multiplication",
    },
    {
      code: "print(987654321 * 123456789)",
      language: "PYTHON",
      output: "121932631112635269\n",
      outcome: "OUTCOME_OK",
    }
  );
  assert.deepEqual(checked, { ok: true });
});

test("verifyComputeFinding accepts a decomposed computation that reuses one operand", () => {
  // 987654321 x 123456789 as 8*N*N + 9*N with N = 123456789:
  // the code never spells out 987654321, but it uses 123456789.
  const checked = verifyComputeFinding(
    "Multiply 987654321 by 123456789 exactly.",
    { kind: "compute", query: "987654321 * 123456789", label: "product" },
    {
      code: "N = 123456789\nprint(8*N*N + 9*N)",
      language: "PYTHON",
      output: "121932631112635269\n",
      outcome: "OUTCOME_OK",
    }
  );
  assert.deepEqual(checked, { ok: true });
});

test("verifyComputeFinding rejects failed code, empty output, and unrelated numbers", () => {
  const step = { kind: "compute" as const, query: "987654321 * 123456789", label: "product" };
  const question = "Multiply 987654321 by 123456789 exactly.";
  // Code never ran.
  assert.deepEqual(
    verifyComputeFinding(question, step, {
      code: "print(1)",
      language: "PYTHON",
      output: "",
      outcome: "OUTCOME_FAILED",
    }),
    { ok: false, issue: "code did not execute successfully" }
  );
  // Code ran but printed nothing.
  assert.deepEqual(
    verifyComputeFinding(question, step, {
      code: "x = 987654321 * 123456789",
      language: "PYTHON",
      output: "",
      outcome: "OUTCOME_OK",
    }),
    { ok: false, issue: "code ran but produced no output" }
  );
  // Code ran on unrelated numbers — a different computation.
  assert.deepEqual(
    verifyComputeFinding(question, step, {
      code: "print(111 * 222)",
      language: "PYTHON",
      output: "24642\n",
      outcome: "OUTCOME_OK",
    }),
    { ok: false, issue: "code did not use the question's numbers" }
  );
  // Numeric question, word output with no number.
  assert.deepEqual(
    verifyComputeFinding(question, step, {
      code: "print(987654321 * 123456789)\nprint('done')",
      language: "PYTHON",
      output: "done\n",
      outcome: "OUTCOME_OK",
    }).ok,
    false
  );
});

test("verifyComputeFinding accepts small arithmetic and bare boolean outputs", () => {
  // No long numbers in the question: the number-use check is
  // vacuous, and small arithmetic passes on OK + output alone.
  assert.deepEqual(
    verifyComputeFinding(
      "What is 2+2?",
      { kind: "compute", query: "2+2", label: "sum" },
      {
        code: "print(2+2)",
        language: "PYTHON",
        output: "4\n",
        outcome: "OUTCOME_OK",
      }
    ),
    { ok: true }
  );
  // Yes-no check: "True"/"False" is a result, not a missing number.
  assert.deepEqual(
    verifyComputeFinding(
      "Is 123456789 divisible by 3?",
      { kind: "compute", query: "123456789 % 3 == 0", label: "divisible" },
      {
        code: "print(123456789 % 3 == 0)",
        language: "PYTHON",
        output: "True\n",
        outcome: "OUTCOME_OK",
      }
    ),
    { ok: true }
  );
});

test("buildComputeBrief joins compute findings and caps the brief", () => {
  const brief = buildComputeBrief([
    {
      step: SAMPLE_PLAN.steps[1],
      finding: "10g = $835.20\n[Executed Python — outcome: OUTCOME_OK]",
    },
  ]);
  assert.match(brief, /835\.20/);
  assert.match(brief, /OUTCOME_OK/);
  assert.equal(
    buildComputeBrief([
      { step: SAMPLE_PLAN.steps[1], finding: "x".repeat(5000) },
    ]).length,
    3000
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

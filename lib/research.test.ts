import test from "node:test";
import assert from "node:assert/strict";

import {
  applyPlanResult,
  applyResearchCancel,
  applyResearchFailure,
  applySearchResult,
  applySynthesizeResult,
  buildReportMarkdown,
  buildSynthesizePrompt,
  canStartResearch,
  isResearchTerminal,
  nextResearchStep,
  parsePlanResponse,
  researchProgress,
  researchReportExport,
  validateResearchQuestion,
  type ResearchRun,
} from "./research.ts";

function makeRun(overrides: Partial<ResearchRun> = {}): ResearchRun {
  return {
    id: "run-1",
    userId: "user-1",
    question: "How do solar sails work?",
    status: "queued",
    plan: [],
    stepIndex: 0,
    notes: [],
    sources: [],
    direction: null,
    reportMarkdown: null,
    error: null,
    stepsUsed: 0,
    createdAt: "2026-11-22T00:00:00.000Z",
    updatedAt: "2026-11-22T00:00:00.000Z",
    ...overrides,
  };
}

test("validateResearchQuestion accepts a real question, rejects junk", () => {
  assert.equal(
    validateResearchQuestion("How do solar sails work in practice?").ok,
    true
  );
  assert.equal(validateResearchQuestion("").ok, false);
  assert.equal(validateResearchQuestion("short").ok, false);
  assert.equal(validateResearchQuestion("x".repeat(2001)).ok, false);
  assert.equal(validateResearchQuestion(42).ok, false);
});

test("canStartResearch enforces the 1 run/day cap", () => {
  assert.equal(canStartResearch(0), true);
  assert.equal(canStartResearch(1), false);
  assert.equal(canStartResearch(5), false);
});

test("nextResearchStep walks plan -> search -> synthesize", () => {
  assert.equal(nextResearchStep(makeRun()), "plan");
  assert.equal(
    nextResearchStep(makeRun({ status: "searching", plan: ["a", "b"], stepIndex: 0 })),
    "search"
  );
  assert.equal(
    nextResearchStep(makeRun({ status: "searching", plan: ["a"], stepIndex: 1 })),
    "synthesize"
  );
  assert.equal(
    nextResearchStep(makeRun({ status: "synthesizing", plan: ["a"], stepIndex: 1 })),
    "synthesize"
  );
  assert.equal(nextResearchStep(makeRun({ status: "done" })), null);
  assert.equal(nextResearchStep(makeRun({ status: "failed" })), null);
  assert.equal(nextResearchStep(makeRun({ status: "cancelled" })), null);
});

test("parsePlanResponse accepts a JSON array and dedupes + caps at 5", () => {
  const plan = parsePlanResponse(
    JSON.stringify(["solar sail thrust", "Solar Sail Thrust", "history", "materials", "missions", "extra", ""])
  );
  assert.deepEqual(plan, [
    "solar sail thrust",
    "history",
    "materials",
    "missions",
    "extra",
  ]);
});

test("parsePlanResponse falls back to one query per line", () => {
  assert.deepEqual(
    parsePlanResponse("solar sail thrust\n- history of sails\n\nmaterials"),
    ["solar sail thrust", "history of sails", "materials"]
  );
  assert.deepEqual(parsePlanResponse("not json at all {{{"), [
    "not json at all {{{",
  ]);
  assert.deepEqual(parsePlanResponse(""), []);
});

test("applyPlanResult stores the plan and moves to searching", () => {
  const next = applyPlanResult(makeRun({ status: "planning" }), ["a", "b"]);
  assert.equal(next.status, "searching");
  assert.deepEqual(next.plan, ["a", "b"]);
  assert.equal(next.stepIndex, 0);
  assert.equal(next.stepsUsed, 1);
});

test("applyPlanResult fails honestly on an empty plan", () => {
  const next = applyPlanResult(makeRun(), []);
  assert.equal(next.status, "failed");
  assert.ok(next.error);
});

test("applySearchResult appends notes, dedupes sources, caps at 15, advances", () => {
  const run = makeRun({
    status: "searching",
    plan: ["a", "b"],
    stepIndex: 0,
    sources: [{ title: "T", uri: "https://x.example" }],
  });
  const next = applySearchResult(run, "- fact one", [
    { title: "T2", uri: "https://x.example" },
    { title: "U", uri: "https://y.example" },
  ]);
  assert.equal(next.status, "searching");
  assert.equal(next.stepIndex, 1);
  assert.deepEqual(next.notes, ["- fact one"]);
  assert.equal(next.sources.length, 2);
  const done = applySearchResult(next, "- fact two", []);
  assert.equal(done.status, "synthesizing");
  assert.equal(done.stepIndex, 2);
});

test("applySearchResult never keeps more than 15 sources", () => {
  const many = Array.from({ length: 20 }, (_, i) => ({
    title: `S${i}`,
    uri: `https://s${i}.example`,
  }));
  const next = applySearchResult(makeRun({ status: "searching", plan: ["a"] }), "n", many);
  assert.equal(next.sources.length, 15);
});

test("buildReportMarkdown appends a numbered Sources section", () => {
  const run = makeRun({
    sources: [
      { title: "NASA", uri: "https://nasa.example/sails" },
      { title: "Wiki", uri: "https://wiki.example/sail" },
    ],
  });
  const md = buildReportMarkdown(run, "# Report\n\nBody [1] here.");
  assert.ok(md.startsWith("# Report"));
  assert.ok(md.includes("## Sources"));
  assert.ok(md.includes("1. [NASA](https://nasa.example/sails)"));
  assert.ok(md.includes("2. [Wiki](https://wiki.example/sail)"));
});

test("buildReportMarkdown says so when no sources were collected", () => {
  const md = buildReportMarkdown(makeRun(), "Body.");
  assert.ok(md.includes("No sources were collected"));
});

test("buildSynthesizePrompt uses only findings and lists sources for citation", () => {
  const prompt = buildSynthesizePrompt(
    makeRun({
      plan: ["a"],
      notes: ["- sails push on light"],
      sources: [{ title: "NASA", uri: "https://nasa.example" }],
      direction: "focus on costs",
    })
  );
  assert.ok(prompt.includes("ONLY the findings below"));
  assert.ok(prompt.includes("focus on costs"));
  assert.ok(prompt.includes("[1] NASA — https://nasa.example"));
});

test("applySynthesizeResult finishes the run with the report", () => {
  const next = applySynthesizeResult(
    makeRun({ status: "synthesizing", plan: ["a"], stepIndex: 1 }),
    "# Done\n\nBody."
  );
  assert.equal(next.status, "done");
  assert.ok(next.reportMarkdown?.includes("# Done"));
  assert.ok(next.reportMarkdown?.includes("## Sources"));
});

test("cancel only touches non-terminal runs; failure marks the run failed", () => {
  const cancelled = applyResearchCancel(makeRun({ status: "searching" }));
  assert.equal(cancelled.status, "cancelled");
  assert.equal(
    applyResearchCancel(makeRun({ status: "done" })).status,
    "done"
  );
  const failed = applyResearchFailure(makeRun(), "Gemini timed out.");
  assert.equal(failed.status, "failed");
  assert.equal(failed.error, "Gemini timed out.");
});

test("researchProgress labels each phase", () => {
  assert.equal(researchProgress(makeRun()).label, "Starting…");
  assert.equal(
    researchProgress(
      makeRun({ status: "searching", plan: ["a", "b"], stepIndex: 0 })
    ).label,
    "Searching 1 of 2"
  );
  assert.equal(
    researchProgress(makeRun({ status: "done", plan: ["a"] })).label,
    "Done"
  );
});

test("researchReportExport returns the report only when done", () => {
  assert.equal(researchReportExport(makeRun()), null);
  assert.equal(
    researchReportExport(
      makeRun({ status: "done", reportMarkdown: "# R" })
    ),
    "# R"
  );
});

test("isResearchTerminal covers done/failed/cancelled only", () => {
  assert.equal(isResearchTerminal("done"), true);
  assert.equal(isResearchTerminal("failed"), true);
  assert.equal(isResearchTerminal("cancelled"), true);
  assert.equal(isResearchTerminal("searching"), false);
  assert.equal(isResearchTerminal("queued"), false);
});

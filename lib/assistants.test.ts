import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSystemPrompt,
  filterAssistantTools,
  findStarterAssistant,
  parseAssistantMode,
  STARTER_ASSISTANTS,
  validateAssistantInput,
  validateCustomInstructions,
} from "./assistants.ts";

test("parseAssistantMode accepts fast/smart/deep and nulls everything else", () => {
  assert.equal(parseAssistantMode("fast"), "fast");
  assert.equal(parseAssistantMode("deep"), "deep");
  assert.equal(parseAssistantMode("turbo"), null);
  assert.equal(parseAssistantMode(null), null);
  assert.equal(parseAssistantMode(undefined), null);
});

test("validateAssistantInput requires a name and caps instructions", () => {
  const empty = validateAssistantInput({ name: "   " });
  assert.equal(empty.ok, false);
  assert.match(empty.errors.join(" "), /name/);

  const tooLong = validateAssistantInput({
    name: "Coach",
    instructions: "x".repeat(8001),
  });
  assert.equal(tooLong.ok, false);
  assert.match(tooLong.errors.join(" "), /8000/);

  const good = validateAssistantInput({
    name: "  Coach ",
    instructions: "Be helpful.",
    toolsEnabled: ["web", "bogus-tool"],
    mode: "deep",
    isPublic: true,
  });
  assert.equal(good.ok, true);
  assert.equal(good.value?.name, "Coach");
  assert.deepEqual(good.value?.toolsEnabled, ["web"]);
  assert.equal(good.value?.mode, "deep");
});

test("filterAssistantTools drops unknown tools and defaults to web", () => {
  assert.deepEqual(filterAssistantTools(["bogus"]), ["web"]);
  assert.deepEqual(filterAssistantTools(undefined), ["web"]);
  assert.deepEqual(filterAssistantTools(["web"]), ["web"]);
});

test("validateCustomInstructions caps global instructions at 4000 chars", () => {
  assert.equal(validateCustomInstructions("x".repeat(4001)).ok, false);
  assert.equal(validateCustomInstructions("  Be concise. ").value, "Be concise.");
});

test("buildSystemPrompt orders custom instructions, assistant, memories", () => {
  const prompt = buildSystemPrompt({
    customInstructions: "Always reply in Hinglish.",
    assistantInstructions: "Ask one question at a time.",
    assistantName: "DSA Interview Coach",
    memories: ["Prefers TypeScript.", "Interviewing for SDE roles."],
  });
  const customAt = prompt.indexOf("Hinglish");
  const assistantAt = prompt.indexOf("DSA Interview Coach");
  const memoryAt = prompt.indexOf("Prefers TypeScript");
  assert.ok(customAt < assistantAt && assistantAt < memoryAt);
  assert.ok(prompt.includes("Interviewing for SDE roles."));
});

test("buildSystemPrompt is empty when nothing is set and caps length", () => {
  assert.equal(buildSystemPrompt({}), "");
  const long = buildSystemPrompt({
    customInstructions: "x".repeat(20000),
  });
  assert.ok(long.length <= 12000);
});

test("starter assistants include DSA Interview Coach and Resume Reviewer", () => {
  const names = STARTER_ASSISTANTS.map((starter) => starter.name);
  assert.ok(names.includes("DSA Interview Coach"));
  assert.ok(names.includes("Resume Reviewer"));
  for (const starter of STARTER_ASSISTANTS) {
    assert.ok(starter.instructions.length > 50);
    assert.ok(starter.description.length > 0);
  }
  assert.equal(findStarterAssistant("dsa interview coach")?.name, "DSA Interview Coach");
  assert.equal(findStarterAssistant("Nope"), null);
});

import test from "node:test";
import assert from "node:assert/strict";

import type { GeneratedProject } from "@/lib/project/project-schema.ts";

import {
  MAX_HISTORY_ENTRIES,
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from "./history.ts";

function makeProject(label: string): GeneratedProject {
  return {
    name: "demo",
    framework: "nextjs",
    files: [{ path: "app/page.tsx", content: label, language: "tsx" }],
  };
}

test("undo restores the previous snapshot and redo re-applies it", () => {
  const before = makeProject("before");
  const after = makeProject("after");

  let history = createHistory();
  history = pushHistory(history, before);

  assert.equal(canUndo(history), true);
  assert.equal(canRedo(history), false);

  const undone = undoHistory(history, after);
  assert.ok(undone);
  assert.equal(undone.project.files[0].content, "before");
  assert.equal(canUndo(undone.history), false);
  assert.equal(canRedo(undone.history), true);

  const redone = redoHistory(undone.history, undone.project);
  assert.ok(redone);
  assert.equal(redone.project.files[0].content, "after");
});

test("undo returns null when the past is empty", () => {
  assert.equal(undoHistory(createHistory(), makeProject("x")), null);
  assert.equal(redoHistory(createHistory(), makeProject("x")), null);
});

test("a new snapshot clears the redo stack", () => {
  let history = pushHistory(createHistory(), makeProject("v1"));
  const undone = undoHistory(history, makeProject("v2"));
  assert.ok(undone);
  assert.equal(canRedo(undone.history), true);

  history = pushHistory(undone.history, makeProject("v3"));
  assert.equal(canRedo(history), false);
  assert.equal(history.past.length, 1);
});

test("the past is capped at MAX_HISTORY_ENTRIES", () => {
  let history = createHistory();
  for (let index = 0; index < MAX_HISTORY_ENTRIES + 10; index += 1) {
    history = pushHistory(history, makeProject(`v${index}`));
  }
  assert.equal(history.past.length, MAX_HISTORY_ENTRIES);
  assert.equal(history.past[0].files[0].content, "v10");
});

test("history snapshots are isolated from later mutation", () => {
  const snapshot = makeProject("original");
  const history = pushHistory(createHistory(), snapshot);
  snapshot.files[0].content = "mutated";

  const undone = undoHistory(history, makeProject("current"));
  assert.ok(undone);
  assert.equal(undone.project.files[0].content, "original");
});

import test from "node:test";
import assert from "node:assert/strict";

import { addedMessageScrollTarget } from "./scroll-anchor.ts";

test("a just-sent user message anchors to the top on send", () => {
  // A send appends the user message AND the empty assistant
  // placeholder in one batch; the prompt still anchors to the top.
  assert.deepEqual(
    addedMessageScrollTarget({
      addedRoles: ["user", "assistant"],
      addedStartIndex: 4,
      autoScroll: true,
    }),
    { align: "start", index: 4 }
  );
});

test("a lone user message anchors to the top", () => {
  assert.deepEqual(
    addedMessageScrollTarget({
      addedRoles: ["user"],
      addedStartIndex: 2,
      autoScroll: true,
    }),
    { align: "start", index: 2 }
  );
});

test("an appended assistant reply still pins to the bottom", () => {
  // The streaming pin is unchanged: a reply starting (or a
  // regenerated reply) scrolls its last row to the bottom.
  assert.deepEqual(
    addedMessageScrollTarget({
      addedRoles: ["assistant"],
      addedStartIndex: 5,
      autoScroll: true,
    }),
    { align: "end", index: 5 }
  );

  assert.deepEqual(
    addedMessageScrollTarget({
      addedRoles: ["assistant", "assistant"],
      addedStartIndex: 5,
      autoScroll: true,
    }),
    { align: "end", index: 6 }
  );
});

test("no yank when the reader scrolled away", () => {
  assert.equal(
    addedMessageScrollTarget({
      addedRoles: ["user", "assistant"],
      addedStartIndex: 4,
      autoScroll: false,
    }),
    null
  );

  assert.equal(
    addedMessageScrollTarget({
      addedRoles: ["assistant"],
      addedStartIndex: 5,
      autoScroll: false,
    }),
    null
  );
});

test("no scroll target when nothing was added", () => {
  assert.equal(
    addedMessageScrollTarget({
      addedRoles: [],
      addedStartIndex: 4,
      autoScroll: true,
    }),
    null
  );
});

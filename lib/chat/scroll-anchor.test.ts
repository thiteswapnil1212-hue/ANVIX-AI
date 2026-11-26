import test from "node:test";
import assert from "node:assert/strict";

import {
  addedMessageScrollTarget,
  bottomSpacerPx,
  isTopAnchorReachable,
} from "./scroll-anchor.ts";

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

test("bottom spacer leaves room for the prompt to reach the top", () => {
  // Desktop list (~792px tall at a 998px viewport): spacer is the
  // viewport minus the reserve.
  assert.equal(bottomSpacerPx(792), 552);
  // The user's ~700px laptop leaves a ~438px list.
  assert.equal(bottomSpacerPx(438), 198);
  // A viewport shorter than the reserve needs no spacer.
  assert.equal(bottomSpacerPx(200), 0);
  assert.equal(bottomSpacerPx(0), 0);
});

test("round-5 live failure: no spacer, the prompt cannot top-anchor", () => {
  // The live re-check (1919x998, 5-message conversation): the tail
  // below a just-sent prompt is the prompt bubble + the empty
  // assistant placeholder + the typing indicator (~260px) plus the
  // 48px bottom padding — far short of the 792px viewport, so the
  // wanted offset exceeded the maximum by ~480px and the prompt
  // sat mid-screen instead of at the top.
  assert.equal(
    isTopAnchorReachable({
      clientHeightPx: 792,
      spacerPx: 0,
      tailBelowRowPx: 260,
      bottomPadPx: 48,
    }),
    false
  );
});

test("with the spacer, the same prompt top-anchors", () => {
  assert.equal(
    isTopAnchorReachable({
      clientHeightPx: 792,
      spacerPx: bottomSpacerPx(792),
      tailBelowRowPx: 260,
      bottomPadPx: 48,
    }),
    true
  );

  // The short laptop screen too.
  assert.equal(
    isTopAnchorReachable({
      clientHeightPx: 438,
      spacerPx: bottomSpacerPx(438),
      tailBelowRowPx: 260,
      bottomPadPx: 48,
    }),
    true
  );
});

test("a tail with no typing row may still fall just short", () => {
  // If the typing indicator is not showing (tail = prompt +
  // placeholder only, ~136px), the anchor lands as high as the
  // geometry allows — ~56px below the top on desktop — instead of
  // exactly at it. Documented, not hidden: the streaming pin owns
  // the view from the first chunk anyway.
  assert.equal(
    isTopAnchorReachable({
      clientHeightPx: 792,
      spacerPx: bottomSpacerPx(792),
      tailBelowRowPx: 136,
      bottomPadPx: 48,
    }),
    false
  );
});

import test from "node:test";
import assert from "node:assert/strict";

import { newMessagesLabel } from "./format-count.ts";

test("jump label has no count when there is nothing unread", () => {
  assert.equal(newMessagesLabel(0), "Jump to latest message");
});

test("jump label uses the singular for one unread message", () => {
  assert.equal(
    newMessagesLabel(1),
    "Jump to latest message, 1 new message"
  );
});

test("jump label uses the plural for several unread messages", () => {
  assert.equal(
    newMessagesLabel(5),
    "Jump to latest message, 5 new messages"
  );
});

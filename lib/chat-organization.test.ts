import test from "node:test";
import assert from "node:assert/strict";

import {
  ORGANIZATION_MIN_CHATS,
  forkConversation,
  isOrganizationUnlocked,
  listFolders,
  listTags,
  normalizeFolderName,
  normalizeTags,
  searchChats,
  type OrganizableConversation,
} from "./chat-organization.ts";

function makeChats(): OrganizableConversation[] {
  return [
    {
      id: "c1",
      title: "DSA arrays",
      preview: "two sum",
      createdAt: "2026-11-20T10:00:00.000Z",
      updatedAt: "2026-11-20T10:00:00.000Z",
      folder: "Interview prep",
      tags: ["DSA", "arrays"],
      messages: [
        { id: "m1", role: "user", content: "Explain two sum" },
        { id: "m2", role: "assistant", content: "Use a hash map" },
        { id: "m3", role: "user", content: "What about the follow-up?" },
      ],
    },
    {
      id: "c2",
      title: "Cold email draft",
      preview: "email to a recruiter",
      createdAt: "2026-11-21T10:00:00.000Z",
      updatedAt: "2026-11-21T10:00:00.000Z",
      folder: "Job hunt",
      tags: ["email"],
      messages: [
        { id: "m4", role: "user", content: "Write a cold email" },
      ],
    },
    {
      id: "c3",
      title: "Untitled notes",
      preview: "random thought",
      createdAt: "2026-11-22T10:00:00.000Z",
      updatedAt: "2026-11-22T10:00:00.000Z",
      messages: [{ id: "m5", role: "user", content: "hello" }],
    },
  ];
}

test("organization unlocks at 10 chats", () => {
  assert.equal(ORGANIZATION_MIN_CHATS, 10);
  assert.equal(isOrganizationUnlocked(9), false);
  assert.equal(isOrganizationUnlocked(10), true);
  assert.equal(isOrganizationUnlocked(25), true);
});

test("normalizeFolderName / normalizeTags clean user input", () => {
  assert.equal(normalizeFolderName("  Interview   prep  "), "Interview prep");
  assert.equal(normalizeFolderName("   "), null);
  assert.equal(normalizeFolderName(42), null);
  assert.equal(normalizeFolderName("x".repeat(50))?.length, 40);

  assert.deepEqual(normalizeTags(["DSA", " dsa ", "Arrays", "", 7]), [
    "dsa",
    "arrays",
  ]);
  assert.deepEqual(normalizeTags("not-an-array"), []);
});

test("listFolders and listTags count chats in use", () => {
  assert.deepEqual(listFolders(makeChats()), [
    { name: "Interview prep", count: 1 },
    { name: "Job hunt", count: 1 },
  ]);
  assert.deepEqual(listTags(makeChats()), [
    { name: "arrays", count: 1 },
    { name: "dsa", count: 1 },
    { name: "email", count: 1 },
  ]);
});

test("searchChats matches message content, folder and tags — not just titles", () => {
  const chats = makeChats();

  // "hash map" appears only inside a message body.
  assert.deepEqual(
    searchChats(chats, { query: "hash map" }).map((c) => c.id),
    ["c1"]
  );
  assert.deepEqual(
    searchChats(chats, { query: "COLD EMAIL" }).map((c) => c.id),
    ["c2"]
  );
  assert.deepEqual(
    searchChats(chats, { query: "interview prep" }).map((c) => c.id),
    ["c1"]
  );
  assert.deepEqual(
    searchChats(chats, { folder: "Job hunt" }).map((c) => c.id),
    ["c2"]
  );
  assert.deepEqual(
    searchChats(chats, { folder: null }).map((c) => c.id),
    ["c3"]
  );
  assert.deepEqual(
    searchChats(chats, { tags: ["dsa"] }).map((c) => c.id),
    ["c1"]
  );
  assert.deepEqual(searchChats(chats, { tags: ["dsa", "email"] }), []);
  assert.equal(searchChats(chats).length, 3);
  assert.deepEqual(searchChats(chats, { query: "no-such-text" }), []);
});

test("forkConversation copies messages up to the fork point only", () => {
  const [original] = makeChats();
  const forked = forkConversation(original, "m2", "c1-branch", "2026-11-22T12:00:00.000Z");

  assert.ok(forked);
  assert.equal(forked.id, "c1-branch");
  assert.equal(forked.title, "DSA arrays (branch)");
  assert.equal(forked.forkedFrom, "c1");
  assert.equal(forked.forkedAtMessageId, "m2");
  assert.equal(forked.pinned, false);
  assert.deepEqual(
    forked.messages.map((m) => m.id),
    ["m1", "m2"]
  );
  // The original is untouched and the fork is a copy, not a shared array.
  assert.equal(original.messages.length, 3);
  assert.notEqual(forked.messages, original.messages);

  assert.equal(
    forkConversation(original, "missing-id", "x", "2026-11-22T12:00:00.000Z"),
    null
  );
});

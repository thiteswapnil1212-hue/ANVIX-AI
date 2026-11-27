import test from "node:test";
import assert from "node:assert/strict";

import {
  STORAGE_INDEX_KEY,
  STORAGE_LEGACY_KEY,
  conversationMessagesKey,
  migrateLegacyStorage,
  parseIndex,
  parseLegacyBlob,
  persistGuestState,
  readConversationMessages,
  readGuestState,
  type GuestChatConversation,
} from "./guest-storage.ts";

/** Minimal in-memory Storage stand-in. */
const createMemoryStorage = (): {
  store: Map<string, string>;
  storage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
} => {
  const store = new Map<string, string>();
  return {
    store,
    storage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  };
};

const legacyBlob = (conversations: GuestChatConversation[]) =>
  JSON.stringify({
    activeConversationId: conversations[0]?.id ?? null,
    conversations,
  });

test("legacy blob migrates to index + per-conversation keys, then deletes the blob", () => {
  const { store, storage } = createMemoryStorage();
  const conversations: GuestChatConversation[] = [
    {
      id: "a",
      title: "First",
      preview: "hello",
      updatedAt: "2026-11-22T10:00:00.000Z",
      createdAt: "2026-11-22T09:00:00.000Z",
      pinned: false,
      messages: [
        {
          id: "m1",
          role: "user",
          content: "hello",
          createdAt: "2026-11-22T09:00:00.000Z",
        },
        {
          id: "m2",
          role: "assistant",
          content: "hi there",
          createdAt: "2026-11-22T09:00:30.000Z",
        },
      ],
    },
    {
      id: "b",
      title: "Second",
      preview: "bye",
      updatedAt: "2026-11-22T08:00:00.000Z",
      createdAt: "2026-11-22T07:00:00.000Z",
      pinned: true,
      messages: [
        {
          id: "m3",
          role: "user",
          content: "bye",
          createdAt: "2026-11-22T07:00:00.000Z",
        },
      ],
    },
  ];
  storage.setItem(STORAGE_LEGACY_KEY, legacyBlob(conversations));

  const migrated = migrateLegacyStorage(storage);

  assert.ok(migrated);
  assert.equal(migrated.activeConversationId, "a");
  assert.equal(migrated.list.length, 2);
  assert.equal(migrated.list[0].id, "a");
  assert.deepEqual(migrated.messagesById["a"], conversations[0].messages);
  // Legacy blob deleted only after the read-back verified.
  assert.equal(store.has(STORAGE_LEGACY_KEY), false);
  // Index holds metadata only — no messages array on any entry.
  const index = parseIndex(store.get(STORAGE_INDEX_KEY) ?? null);
  assert.ok(index);
  assert.equal(index.conversations.length, 2);
  assert.equal(
    "messages" in (index.conversations[0] as unknown as Record<
      string,
      unknown
    >),
    false
  );
  // Per-conversation keys hold the messages.
  assert.deepEqual(
    readConversationMessages(storage, "b"),
    conversations[1].messages
  );
});

test("readGuestState round-trips: index load returns only the active conversation's messages", () => {
  const { storage } = createMemoryStorage();
  const conversations: GuestChatConversation[] = [
    {
      id: "a",
      title: "First",
      preview: "hello",
      updatedAt: "2026-11-22T10:00:00.000Z",
      createdAt: "2026-11-22T09:00:00.000Z",
      pinned: false,
      messages: [
        {
          id: "m1",
          role: "user",
          content: "hello",
          createdAt: "2026-11-22T09:00:00.000Z",
        },
      ],
    },
    {
      id: "b",
      title: "Second",
      preview: "bye",
      updatedAt: "2026-11-22T08:00:00.000Z",
      createdAt: "2026-11-22T07:00:00.000Z",
      pinned: false,
      messages: [
        {
          id: "m2",
          role: "user",
          content: "bye",
          createdAt: "2026-11-22T07:00:00.000Z",
        },
      ],
    },
  ];
  storage.setItem(STORAGE_LEGACY_KEY, legacyBlob(conversations));

  // First read migrates the legacy blob.
  const first = readGuestState(storage);
  assert.equal(first.activeConversationId, "a");
  assert.deepEqual(Object.keys(first.messagesById), ["a"]);

  // Second read uses the index: same list, only the active messages loaded.
  const second = readGuestState(storage);
  assert.equal(second.activeConversationId, "a");
  assert.equal(second.list.length, 2);
  assert.deepEqual(Object.keys(second.messagesById), ["a"]);
  assert.deepEqual(second.messagesById["a"], conversations[0].messages);
});

test("corrupt index falls back to the legacy blob", () => {
  const { storage } = createMemoryStorage();
  const conversations: GuestChatConversation[] = [
    {
      id: "a",
      title: "First",
      preview: "hello",
      updatedAt: "2026-11-22T10:00:00.000Z",
      createdAt: "2026-11-22T09:00:00.000Z",
      pinned: false,
      messages: [
        {
          id: "m1",
          role: "user",
          content: "hello",
          createdAt: "2026-11-22T09:00:00.000Z",
        },
      ],
    },
  ];
  storage.setItem(STORAGE_INDEX_KEY, "{not json");
  storage.setItem(STORAGE_LEGACY_KEY, legacyBlob(conversations));

  const state = readGuestState(storage);
  assert.equal(state.activeConversationId, "a");
  assert.equal(state.list.length, 1);
  assert.deepEqual(state.messagesById["a"], conversations[0].messages);
});

test("persistGuestState writes the index + only loaded message keys", () => {
  const { store, storage } = createMemoryStorage();
  const list = [
    {
      id: "a",
      title: "First",
      preview: "hello",
      updatedAt: "2026-11-22T10:00:00.000Z",
      createdAt: "2026-11-22T09:00:00.000Z",
      pinned: false,
    },
    {
      id: "b",
      title: "Second",
      preview: "bye",
      updatedAt: "2026-11-22T08:00:00.000Z",
      createdAt: "2026-11-22T07:00:00.000Z",
      pinned: false,
    },
  ];
  const messagesById = {
    a: [
      {
        id: "m1",
        role: "user" as const,
        content: "hello",
        createdAt: "2026-11-22T09:00:00.000Z",
      },
    ],
  };

  persistGuestState(storage, list, "a", messagesById);

  assert.deepEqual(
    parseIndex(store.get(STORAGE_INDEX_KEY) ?? null)?.conversations.map(
      (meta) => meta.id
    ),
    ["a", "b"]
  );
  assert.equal(store.has(conversationMessagesKey("a")), true);
  // Conversation "b" was not loaded, so its messages key is not written.
  assert.equal(store.has(conversationMessagesKey("b")), false);
  // No legacy blob is ever written by the new persist path.
  assert.equal(store.has(STORAGE_LEGACY_KEY), false);
});

test("persistGuestState with onlyIds rewrites only the dirty keys", () => {
  const { store, storage } = createMemoryStorage();
  const list = [
    {
      id: "a",
      title: "First",
      preview: "hello",
      updatedAt: "2026-11-22T10:00:00.000Z",
      createdAt: "2026-11-22T09:00:00.000Z",
      pinned: false,
    },
    {
      id: "b",
      title: "Second",
      preview: "bye",
      updatedAt: "2026-11-22T08:00:00.000Z",
      createdAt: "2026-11-22T07:00:00.000Z",
      pinned: false,
    },
  ];
  const msg = (id: string, content: string) => ({
    id,
    role: "user" as const,
    content,
    createdAt: "2026-11-22T09:00:00.000Z",
  });
  const messagesById = {
    a: [msg("m1", "hello")],
    b: [msg("m2", "bye")],
  };

  persistGuestState(storage, list, "a", messagesById);
  const beforeA = store.get(conversationMessagesKey("a"));
  const beforeB = store.get(conversationMessagesKey("b"));

  // Only "a" changed: "b"'s key must be byte-identical afterwards,
  // and the index is still rewritten (metadata is cheap).
  const changed = {
    a: [msg("m1", "hello"), msg("m3", "again")],
    b: [msg("m2", "bye")],
  };
  persistGuestState(storage, list, "a", changed, null, new Set(["a"]));
  assert.notEqual(store.get(conversationMessagesKey("a")), beforeA);
  assert.equal(store.get(conversationMessagesKey("b")), beforeB);
  assert.deepEqual(
    JSON.parse(store.get(conversationMessagesKey("a")) ?? "[]").map(
      (m: { content: string }) => m.content
    ),
    ["hello", "again"]
  );

  // Empty dirty set: no message key is touched at all.
  persistGuestState(storage, list, "a", changed, null, new Set());
  assert.equal(store.get(conversationMessagesKey("b")), beforeB);
});

test("persistGuestState always writes the overlay conversation's key", () => {
  const { store, storage } = createMemoryStorage();
  const list = [
    {
      id: "a",
      title: "First",
      preview: "hello",
      updatedAt: "2026-11-22T10:00:00.000Z",
      createdAt: "2026-11-22T09:00:00.000Z",
      pinned: false,
    },
  ];
  const messagesById = {
    a: [
      {
        id: "m1",
        role: "assistant" as const,
        content: "",
        createdAt: "2026-11-22T09:00:00.000Z",
      },
    ],
  };
  const overlay = {
    conversationId: "a",
    messageId: "m1",
    content: "streamed so far",
    thinking: "",
    sources: [],
  };

  // The overlay's conversation is NOT in onlyIds — it must still be
  // written, carrying the in-flight text (the interim-persist case).
  persistGuestState(storage, list, "a", messagesById, overlay, new Set());
  const stored = JSON.parse(
    store.get(conversationMessagesKey("a")) ?? "[]"
  ) as { content: string }[];
  assert.equal(stored[0]?.content, "streamed so far");
});

test("parseLegacyBlob returns empty state for garbage input", () => {
  assert.deepEqual(parseLegacyBlob(null), {
    activeConversationId: null,
    conversations: [],
  });
  assert.deepEqual(parseLegacyBlob("{nope"), {
    activeConversationId: null,
    conversations: [],
  });
});

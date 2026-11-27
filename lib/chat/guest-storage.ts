/**
 * Guest chat storage (perf): the chat history used to live in a single
 * localStorage blob (`anvix-guest-chats`) holding every conversation and
 * every message. Opening /chat parsed and normalized all of it on the
 * main thread, so mount cost grew with history size.
 *
 * New shape:
 * - `anvix-guest-chats:index` — metadata only (id/title/preview/
 *   updatedAt/createdAt/pinned) + the active conversation id.
 * - `anvix-guest-chat:<id>` — that conversation's messages array.
 * Mount parses only the index + the active conversation's messages;
 * other conversations load on demand when selected.
 *
 * Migration: a legacy blob is converted once (write index + per-key
 * entries, verify the read-back, then delete the legacy key). The
 * legacy blob is kept as backup until the read-back verifies.
 *
 * Pure functions over a minimal Storage interface so the migration
 * round-trip is unit-testable without a browser (see
 * guest-storage.test.ts). The component passes window.localStorage.
 */

import type { GroundingSource } from "../gemini/grounding.ts";
import type { GeneratedImage } from "../image-client.ts";
import {
  normalizeFolderName,
  normalizeTags,
} from "../chat-organization.ts";

export interface GuestChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  /** Thought-summary text (assistant only; local display data). */
  thinking?: string;
  /** Grounded web sources (assistant only; local display data). */
  sources?: GroundingSource[];
  /** Files attached to this message (user only; name + type, no data). */
  attachments?: { name: string; mimeType: string }[];
  /** A Pollinations image generated for this message (assistant only). */
  generatedImage?: GeneratedImage;
  /** The user prompt this answer replies to (assistant only). */
  comparePrompt?: string;
}

export interface GuestChatMeta {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  createdAt: string;
  pinned?: boolean;
  /** Organization folder (null = no folder). */
  folder?: string | null;
  /** Lowercase tags. */
  tags?: string[];
  /** Id of the chat this one was branched from, if any. */
  forkedFrom?: string;
}

export interface GuestChatConversation extends GuestChatMeta {
  messages: GuestChatMessage[];
}

export interface GuestChatIndex {
  activeConversationId: string | null;
  conversations: GuestChatMeta[];
}

/** In-memory guest state: metadata list + only the loaded messages. */
export interface GuestChatState {
  activeConversationId: string | null;
  list: GuestChatMeta[];
  messagesById: Record<string, GuestChatMessage[]>;
}

/** In-flight streamed answer, for interim persists during a stream. */
export interface StreamingOverlay {
  conversationId: string;
  messageId: string;
  content: string;
  thinking: string;
  sources: GroundingSource[];
}

export const STORAGE_LEGACY_KEY = "anvix-guest-chats";
export const STORAGE_INDEX_KEY = "anvix-guest-chats:index";
export const conversationMessagesKey = (id: string): string =>
  `anvix-guest-chat:${id}`;

export interface GuestStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const createTimestamp = (): string => new Date().toISOString();

export function sortConversations<T extends { updatedAt: string }>(
  conversations: T[]
): T[] {
  return [...conversations].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

const isMessage = (value: unknown): value is GuestChatMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;

  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
};

export function normalizeMessage(
  value: unknown,
  fallbackCreatedAt: string
): GuestChatMessage | null {
  if (!isMessage(value)) {
    return null;
  }

  const message: GuestChatMessage = {
    ...value,
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : fallbackCreatedAt,
  };

  // A blob URL dies on reload — saved messages keep the Pollinations
  // URL so the image still loads (same rule as toPersistableImage in
  // image-client; inlined here so this module stays dependency-free
  // for the node test runner).
  if (
    message.generatedImage &&
    message.generatedImage.url.startsWith("blob:") &&
    message.generatedImage.sourceUrl
  ) {
    message.generatedImage = {
      ...message.generatedImage,
      url: message.generatedImage.sourceUrl,
    };
  }

  return message;
}

const normalizeMeta = (value: unknown): GuestChatMeta | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const conversation = value as Record<string, unknown>;

  if (typeof conversation.id !== "string") {
    return null;
  }

  const now = createTimestamp();
  const updatedAt =
    typeof conversation.updatedAt === "string"
      ? conversation.updatedAt
      : now;

  return {
    id: conversation.id,
    title:
      typeof conversation.title === "string" &&
      conversation.title.trim()
        ? conversation.title
        : "New chat",
    preview:
      typeof conversation.preview === "string"
        ? conversation.preview
        : "",
    updatedAt,
    createdAt:
      typeof conversation.createdAt === "string"
        ? conversation.createdAt
        : updatedAt,
    pinned: Boolean(conversation.pinned),
    folder: normalizeFolderName(conversation.folder),
    tags: normalizeTags(conversation.tags),
    forkedFrom:
      typeof conversation.forkedFrom === "string"
        ? conversation.forkedFrom
        : undefined,
  };
};

export function normalizeConversation(
  value: unknown
): GuestChatConversation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const meta = normalizeMeta(value);
  if (!meta) {
    return null;
  }

  const conversation = value as Record<string, unknown>;
  const now = createTimestamp();
  const messages = Array.isArray(conversation.messages)
    ? conversation.messages
        .map((message) => normalizeMessage(message, now))
        .filter(
          (message): message is GuestChatMessage => message !== null
        )
    : [];

  return {
    ...meta,
    preview:
      meta.preview ||
      messages[messages.length - 1]?.content ||
      "",
    messages,
  };
}

export function toMeta(
  conversation: GuestChatConversation
): GuestChatMeta {
  return {
    id: conversation.id,
    title: conversation.title,
    preview: conversation.preview,
    updatedAt: conversation.updatedAt,
    createdAt: conversation.createdAt,
    pinned: conversation.pinned,
    folder: conversation.folder ?? null,
    tags: conversation.tags ?? [],
    forkedFrom: conversation.forkedFrom,
  };
}

/** Parse the legacy full-blob shape ({ activeConversationId, conversations }). */
export function parseLegacyBlob(raw: string | null): {
  activeConversationId: string | null;
  conversations: GuestChatConversation[];
} {
  if (!raw) {
    return { activeConversationId: null, conversations: [] };
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return { activeConversationId: null, conversations: [] };
    }

    const record = parsed as Record<string, unknown>;
    const conversations = Array.isArray(record.conversations)
      ? record.conversations
          .map(normalizeConversation)
          .filter(
            (
              conversation
            ): conversation is GuestChatConversation =>
              conversation !== null
          )
      : [];

    const sorted = sortConversations(conversations);
    const savedActiveId =
      typeof record.activeConversationId === "string"
        ? record.activeConversationId
        : null;
    const activeConversationId =
      savedActiveId &&
      sorted.some(
        (conversation) => conversation.id === savedActiveId
      )
        ? savedActiveId
        : sorted[0]?.id ?? null;

    return { activeConversationId, conversations: sorted };
  } catch {
    return { activeConversationId: null, conversations: [] };
  }
}

/** Parse the index shape ({ activeConversationId, conversations: metas }). */
export function parseIndex(raw: string | null): GuestChatIndex | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const record = parsed as Record<string, unknown>;

    if (!Array.isArray(record.conversations)) {
      return null;
    }

    const conversations = record.conversations
      .map(normalizeMeta)
      .filter((meta): meta is GuestChatMeta => meta !== null);
    const sorted = sortConversations(conversations);
    const savedActiveId =
      typeof record.activeConversationId === "string"
        ? record.activeConversationId
        : null;
    const activeConversationId =
      savedActiveId &&
      sorted.some((conversation) => conversation.id === savedActiveId)
        ? savedActiveId
        : sorted[0]?.id ?? null;

    return { activeConversationId, conversations: sorted };
  } catch {
    return null;
  }
}

export function readConversationMessages(
  storage: GuestStorage,
  id: string
): GuestChatMessage[] | null {
  try {
    const raw = storage.getItem(conversationMessagesKey(id));

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const now = createTimestamp();
    return parsed
      .map((message) => normalizeMessage(message, now))
      .filter(
        (message): message is GuestChatMessage => message !== null
      );
  } catch {
    return null;
  }
}

/**
 * One-time migration: legacy blob -> index + per-conversation keys.
 * Writes the index and every messages key, verifies the read-back,
 * and only then deletes the legacy key. Returns the migrated state,
 * or null when there is no legacy blob to migrate.
 */
export function migrateLegacyStorage(
  storage: GuestStorage
): GuestChatState | null {
  const raw = storage.getItem(STORAGE_LEGACY_KEY);

  if (!raw) {
    return null;
  }

  const legacy = parseLegacyBlob(raw);

  if (legacy.conversations.length === 0) {
    return null;
  }

  const list = legacy.conversations.map(toMeta);
  const index: GuestChatIndex = {
    activeConversationId: legacy.activeConversationId,
    conversations: sortConversations(list),
  };

  storage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
  for (const conversation of legacy.conversations) {
    storage.setItem(
      conversationMessagesKey(conversation.id),
      JSON.stringify(conversation.messages)
    );
  }

  // Verify the read-back before deleting the legacy blob.
  const verifyIndex = storage.getItem(STORAGE_INDEX_KEY);
  const verifyActive =
    legacy.activeConversationId === null
      ? "[]"
      : storage.getItem(
          conversationMessagesKey(legacy.activeConversationId)
        );

  if (verifyIndex !== null && verifyActive !== null) {
    storage.removeItem(STORAGE_LEGACY_KEY);
  }

  const messagesById: Record<string, GuestChatMessage[]> = {};
  if (legacy.activeConversationId) {
    const messages = readConversationMessages(
      storage,
      legacy.activeConversationId
    );
    if (messages) {
      messagesById[legacy.activeConversationId] = messages;
    }
  }

  return {
    activeConversationId: legacy.activeConversationId,
    list: index.conversations,
    messagesById,
  };
}

/**
 * Load the guest state: index + active conversation's messages only.
 * Falls back to the legacy migration when no index exists (or it is
 * corrupt and a legacy blob still exists). Returns empty state when
 * there is nothing stored at all.
 */
export function readGuestState(
  storage: GuestStorage | null
): GuestChatState {
  const empty: GuestChatState = {
    activeConversationId: null,
    list: [],
    messagesById: {},
  };

  if (!storage) {
    return empty;
  }

  try {
    const index = parseIndex(storage.getItem(STORAGE_INDEX_KEY));

    if (index) {
      const messagesById: Record<string, GuestChatMessage[]> = {};
      if (index.activeConversationId) {
        const messages = readConversationMessages(
          storage,
          index.activeConversationId
        );
        if (messages) {
          messagesById[index.activeConversationId] = messages;
        }
      }
      return {
        activeConversationId: index.activeConversationId,
        list: index.conversations,
        messagesById,
      };
    }
  } catch {
    // Fall through to the migration below.
  }

  const migrated = migrateLegacyStorage(storage);
  return migrated ?? empty;
}

/** Fold an in-flight streamed answer into its message row. */
export function applyStreamingOverlay(
  messages: GuestChatMessage[],
  overlay: StreamingOverlay
): GuestChatMessage[] {
  return messages.map((message) =>
    message.id === overlay.messageId
      ? {
          ...message,
          content: overlay.content,
          thinking: overlay.thinking,
          sources: overlay.sources,
        }
      : message
  );
}

/**
 * Write the guest state: the metadata index (always — it is metadata
 * only, so cheap) plus one key per dirty loaded conversation. Only
 * loaded conversations are written — the loaded set is bounded by
 * design (active + recently visited), so a persist never rewrites the
 * whole history. The optional overlay folds in-flight streamed text
 * into its message row (interim persists during a stream).
 *
 * `onlyIds` (perf): when the caller passes the set of conversations
 * whose messages changed since the last persist, only those keys are
 * rewritten — a long chat no longer pays a full re-serialize of every
 * loaded conversation on every persist. The overlay's conversation is
 * always written, even when it is not in `onlyIds`: its stored copy
 * must carry the in-flight text. Omit `onlyIds` to write every loaded
 * key, as before.
 */
export function persistGuestState(
  storage: GuestStorage,
  list: GuestChatMeta[],
  activeConversationId: string | null,
  messagesById: Record<string, GuestChatMessage[]>,
  overlay?: StreamingOverlay | null,
  onlyIds?: Set<string> | null
): void {
  const index: GuestChatIndex = {
    activeConversationId,
    conversations: sortConversations(list),
  };
  storage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));

  const idsToWrite =
    onlyIds === undefined || onlyIds === null
      ? null
      : new Set(onlyIds);
  if (overlay && idsToWrite) idsToWrite.add(overlay.conversationId);

  for (const [id, messages] of Object.entries(messagesById)) {
    if (idsToWrite && !idsToWrite.has(id)) continue;
    const finalMessages =
      overlay && overlay.conversationId === id
        ? applyStreamingOverlay(messages, overlay)
        : messages;
    storage.setItem(
      conversationMessagesKey(id),
      JSON.stringify(finalMessages)
    );
  }
}

/**
 * Chat organization — pure helpers shared by the sidebar and the chat
 * layout. No storage, no network: folders/tags live on the conversation
 * object (localStorage always; Supabase once the migration in
 * supabase/migrations/20261122_chat_organization.sql is applied, and
 * the cloud layer tolerates it missing).
 *
 * Search is client-side over the chats already loaded in the browser.
 * It does NOT assume pgvector/RAG exists — that is a separate wave.
 */

/** Organization UI (folder filters + assign) unlocks at this many chats. */
export const ORGANIZATION_MIN_CHATS = 10;

export function isOrganizationUnlocked(chatCount: number): boolean {
  return chatCount >= ORGANIZATION_MIN_CHATS;
}

/** A folder name is one trimmed line, at most 40 chars. */
export function normalizeFolderName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, 40);
  return cleaned ? cleaned : null;
}

/** Tags: lowercase, trimmed, de-duplicated, at most 10, 24 chars each. */
export function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 24);
    if (tag) seen.add(tag);
    if (seen.size >= 10) break;
  }
  return [...seen];
}

export interface OrganizableMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface OrganizableConversation<
  TMessage extends OrganizableMessage = OrganizableMessage,
> {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  folder?: string | null;
  tags?: string[];
  messages: TMessage[];
}

/** Folders in use, sorted alphabetically, with their chat counts. */
export function listFolders<TMessage extends OrganizableMessage>(
  conversations: OrganizableConversation<TMessage>[]
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const conversation of conversations) {
    const folder = normalizeFolderName(conversation.folder);
    if (folder) counts.set(folder, (counts.get(folder) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** All tags in use, sorted alphabetically, with their chat counts. */
export function listTags<TMessage extends OrganizableMessage>(
  conversations: OrganizableConversation<TMessage>[]
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const conversation of conversations) {
    for (const tag of normalizeTags(conversation.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface ChatSearchFilters {
  query?: string;
  /** Exact folder name, or null for "no folder". Undefined = any. */
  folder?: string | null;
  /** Match chats carrying ALL of these tags. */
  tags?: string[];
}

/**
 * Client-side search over loaded chats. The query matches title,
 * preview, folder, tags and the text of every message in the chat
 * (case-insensitive substring match). Empty query + no filters returns
 * the list unchanged.
 */
export function searchChats<TMessage extends OrganizableMessage>(
  conversations: OrganizableConversation<TMessage>[],
  filters: ChatSearchFilters = {}
): OrganizableConversation<TMessage>[] {
  const query = (filters.query ?? "").trim().toLowerCase();
  const wantedTags = normalizeTags(filters.tags ?? []);
  const folderFilter = filters.folder;

  return conversations.filter((conversation) => {
    if (folderFilter !== undefined) {
      const folder = normalizeFolderName(conversation.folder);
      if (folderFilter === null ? folder !== null : folder !== folderFilter) {
        return false;
      }
    }

    if (wantedTags.length > 0) {
      const tags = normalizeTags(conversation.tags);
      if (!wantedTags.every((tag) => tags.includes(tag))) return false;
    }

    if (!query) return true;

    const haystack = [
      conversation.title,
      conversation.preview,
      conversation.folder ?? "",
      normalizeTags(conversation.tags).join(" "),
      ...conversation.messages.map((message) => message.content),
    ]
      .join("\n")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export interface ForkedConversation<TMessage extends OrganizableMessage>
  extends OrganizableConversation<TMessage> {
  forkedFrom: string;
  forkedAtMessageId: string;
}

/**
 * Branch/fork a chat at one message: copy the message list up to and
 * including that message into a new conversation. The original chat is
 * never modified. Returns null when the message id is not in the chat.
 * The caller supplies the new id and timestamp (crypto.randomUUID /
 * new Date().toISOString() in the UI) so this stays pure and testable.
 */
export function forkConversation<TMessage extends OrganizableMessage>(
  conversation: OrganizableConversation<TMessage>,
  messageId: string,
  newId: string,
  now: string
): ForkedConversation<TMessage> | null {
  const index = conversation.messages.findIndex(
    (message) => message.id === messageId
  );
  if (index < 0) return null;

  const kept = conversation.messages.slice(0, index + 1);
  return {
    ...conversation,
    id: newId,
    title: `${conversation.title} (branch)`,
    preview: kept[kept.length - 1]?.content ?? conversation.preview,
    createdAt: now,
    updatedAt: now,
    pinned: false,
    messages: kept.map((message) => ({ ...message })),
    forkedFrom: conversation.id,
    forkedAtMessageId: messageId,
  };
}

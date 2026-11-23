/**
 * Pure row mappers for cloud persistence (`lib/supabase/cloud.ts`).
 *
 * Kept dependency-free — no Supabase client, no `@/` imports — so the
 * mapping logic unit-tests under plain `node --test` without a network
 * or env. `cloud.ts` owns the IO; this module owns the shapes.
 *
 * Shapes mirror the browser-local types in
 * `lib/chat/guest-storage.ts` (`GuestChatMessage`): thinking and
 * sources are assistant-only display data, attachments are user-only
 * name + type (never file bytes). The `messages` columns come from
 * migration 0002; the `profiles` columns from the same migration.
 * Rows written before that migration (or read from a deployment whose
 * SQL was never applied) come back without the new columns — every
 * mapper treats them as absent instead of throwing.
 */

export interface CloudMessageSource {
  title: string;
  uri: string;
}

export interface CloudMessageAttachment {
  name: string;
  mimeType: string;
}

export interface CloudMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  /** Thought-summary text (assistant only). */
  thinking?: string;
  /** Grounded web sources (assistant only). */
  sources?: CloudMessageSource[];
  /** Files attached to this message (user only; name + type, no data). */
  attachments?: CloudMessageAttachment[];
  /** Chat mode the message was generated under (e.g. "smart"). */
  mode?: string;
}

export interface CloudProfile {
  email: string | null;
  displayName: string | null;
  /** Global instructions injected into every system prompt. */
  customInstructions?: string | null;
  /** Default chat mode ("fast" | "smart" | "deep"). */
  defaultChatMode?: string;
  /** Default thinking choice ("off" | "fast" | "deep"). */
  defaultThinking?: string;
}

/** A `messages` row as PostgREST returns it (jsonb comes back untyped). */
export interface MessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  thinking?: string | null;
  sources?: unknown;
  attachments?: unknown;
  mode?: string | null;
}

/** A `profiles` row as PostgREST returns it. */
export interface ProfileRow {
  email: string | null;
  display_name: string | null;
  custom_instructions?: string | null;
  default_chat_mode?: string | null;
  default_thinking?: string | null;
}

/** DESIGN.md §3.2: sources are capped in code, not in SQL. */
export const MAX_CLOUD_MESSAGE_SOURCES = 20;

function asSource(value: unknown): CloudMessageSource | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  if (typeof entry.title !== "string" || typeof entry.uri !== "string") {
    return null;
  }
  return { title: entry.title, uri: entry.uri };
}

function asAttachment(value: unknown): CloudMessageAttachment | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  if (typeof entry.name !== "string" || typeof entry.mimeType !== "string") {
    return null;
  }
  return { name: entry.name, mimeType: entry.mimeType };
}

function asMappedArray<T>(
  value: unknown,
  coerce: (entry: unknown) => T | null,
  limit: number
): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: T[] = [];
  for (const entry of value) {
    const mapped = coerce(entry);
    if (mapped) out.push(mapped);
    if (out.length >= limit) break;
  }
  return out;
}

/** Map one `messages` row to the app's `CloudMessage` shape. */
export function mapMessageRow(row: MessageRow): CloudMessage {
  const message: CloudMessage = {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
  if (typeof row.thinking === "string" && row.thinking) {
    message.thinking = row.thinking;
  }
  const sources = asMappedArray(
    row.sources,
    asSource,
    MAX_CLOUD_MESSAGE_SOURCES
  );
  if (sources !== undefined) message.sources = sources;
  const attachments = asMappedArray(row.attachments, asAttachment, 10);
  if (attachments !== undefined) message.attachments = attachments;
  if (typeof row.mode === "string" && row.mode) message.mode = row.mode;
  return message;
}

/** Map one `profiles` row to the app's `CloudProfile` shape. */
export function mapProfileRow(row: ProfileRow): CloudProfile {
  const profile: CloudProfile = {
    email: row.email,
    displayName: row.display_name,
  };
  if (typeof row.custom_instructions === "string") {
    profile.customInstructions = row.custom_instructions;
  }
  if (typeof row.default_chat_mode === "string" && row.default_chat_mode) {
    profile.defaultChatMode = row.default_chat_mode;
  }
  if (typeof row.default_thinking === "string" && row.default_thinking) {
    profile.defaultThinking = row.default_thinking;
  }
  return profile;
}

/**
 * Build the insert row for one message. New columns are omitted when
 * the message does not carry them, so the database defaults apply
 * (`sources` / `attachments` default `[]`, `mode` defaults
 * `'smart'`); `thinking` is null for user messages.
 */
export function toMessageInsertRow(
  message: CloudMessage,
  conversationId: string,
  userId: string
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: message.id,
    conversation_id: conversationId,
    user_id: userId,
    role: message.role,
    content: message.content,
    created_at: message.createdAt,
  };
  if (message.thinking !== undefined) row.thinking = message.thinking;
  if (message.sources !== undefined) {
    row.sources = message.sources.slice(0, MAX_CLOUD_MESSAGE_SOURCES);
  }
  if (message.attachments !== undefined) row.attachments = message.attachments;
  if (message.mode !== undefined) row.mode = message.mode;
  return row;
}

/**
 * True when a PostgREST error means "this deployment's tables do not
 * have the new columns yet" (unknown column, code PGRST204). Callers
 * retry without the new columns so sync keeps working on old schemas.
 */
export function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  if (record.code === "PGRST204") return true;
  const message =
    typeof record.message === "string" ? record.message : "";
  return /column/i.test(message);
}

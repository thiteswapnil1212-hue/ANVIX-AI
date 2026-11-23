import { supabase } from "./client";
import { normalizeFolderName, normalizeTags } from "@/lib/chat-organization";
import {
  isMissingColumnError,
  mapMessageRow,
  mapProfileRow,
  toMessageInsertRow,
  type CloudMessage,
  type CloudProfile,
  type MessageRow,
  type ProfileRow,
} from "./cloud-mapping";

// Re-exported so existing import sites (`@/lib/supabase/cloud`) keep
// working; the shapes live in `./cloud-mapping.ts` (pure, unit-tested).
export type { CloudMessage, CloudProfile } from "./cloud-mapping";

/**
 * Cloud persistence for chats and generated projects (Supabase).
 *
 * Shapes intentionally mirror the browser-local types in
 * components/chat/ChatLayout.tsx and lib/project/project-schema.ts so the
 * UI can swap storage backends without changing its state model:
 * timestamps are ISO strings and ids are UUIDs end to end.
 *
 * Every function no-ops safely (returns null / false) when Supabase is
 * not configured on the deployment, so guest mode never breaks.
 *
 * New `messages` / `profiles` columns (migration 0002: thinking,
 * sources, attachments, mode, custom_instructions, default_chat_mode,
 * default_thinking) are read and written when the deployment has them;
 * on an older schema the same calls retry without those columns, so
 * sync keeps working instead of failing the whole load.
 */

export interface CloudConversation {
  id: string;
  title: string;
  preview: string;
  pinned?: boolean;
  /** Folder name, or null for no folder (see migration 20261122). */
  folder?: string | null;
  /** Lowercase tags (see migration 20261122). */
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  messages: CloudMessage[];
}

export interface CloudProject {
  id: string;
  name: string;
  framework: string;
  files: { path: string; content: string; language: string }[];
  prompt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConversationRow {
  id: string;
  title: string;
  preview: string;
  pinned: boolean;
  folder?: string | null;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface ProjectRow {
  id: string;
  name: string;
  framework: string;
  files: CloudProject["files"];
  prompt: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------- conversations

export interface CloudConversationMeta {
  id: string;
  title: string;
  preview: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

// List-first loading (perf): fetch conversation metadata only, newest
// first, paginated. Messages load on demand per conversation via
// fetchConversationMessages, so sign-in no longer downloads the whole
// history (messages included) up front.
export async function fetchConversationList(
  userId: string,
  options?: { limit?: number; before?: string }
): Promise<CloudConversationMeta[] | null> {
  if (!supabase) return null;

  const limit = options?.limit ?? 20;

  let query = supabase
    .from("conversations")
    .select("id, title, preview, pinned, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (options?.before) {
    query = query.lt("updated_at", options.before);
  }

  const { data, error } = await query.range(0, limit - 1);

  if (error || !data) {
    console.warn("Unable to load cloud conversation list.", error);
    return null;
  }

  return (data as ConversationRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    preview: row.preview,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// Messages for one conversation, latest `limit` first (fetched newest
// first, then reversed to chronological order). Pass `before` (the
// createdAt of the oldest loaded message) to page older messages.
// Selects the migration-0002 columns (thinking, sources, attachments,
// mode) and retries without them on an older schema.
const MESSAGE_COLUMNS =
  "id, conversation_id, role, content, thinking, sources, attachments, mode, created_at";
const MESSAGE_COLUMNS_LEGACY =
  "id, conversation_id, role, content, created_at";

export async function fetchConversationMessages(
  userId: string,
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<CloudMessage[] | null> {
  if (!supabase) return null;

  // Narrowed once here: `supabase` is a module binding, so a closure
  // cannot rely on the null check above — capture the narrowed value.
  const db = supabase;
  const limit = options?.limit ?? 100;

  const runQuery = async (columns: string) => {
    let query = db
      .from("messages")
      .select(columns)
      .eq("user_id", userId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false });

    if (options?.before) {
      query = query.lt("created_at", options.before);
    }

    return query.range(0, limit - 1);
  };

  let { data, error } = await runQuery(MESSAGE_COLUMNS);

  if (error && isMissingColumnError(error)) {
    ({ data, error } = await runQuery(MESSAGE_COLUMNS_LEGACY));
  }

  if (error || !data) {
    console.warn("Unable to load cloud messages.", error);
    return null;
  }

  return ((data as unknown as MessageRow[]) ?? [])
    .map(mapMessageRow)
    .reverse();
}

// Upsert the conversation row only (no message rewrite). Use for
// title/pin changes; a rename used to rewrite all of that
// conversation's messages through syncConversation.
export async function syncConversationMeta(
  userId: string,
  conversation: CloudConversationMeta
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase.from("conversations").upsert(
    {
      id: conversation.id,
      user_id: userId,
      title: conversation.title,
      preview: conversation.preview,
      pinned: Boolean(conversation.pinned),
      created_at: conversation.createdAt,
      updated_at: conversation.updatedAt,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.warn("Unable to sync conversation metadata.", error);
    return false;
  }

  return true;
}

export async function upsertConversation(
  userId: string,
  conversation: CloudConversation
): Promise<boolean> {
  if (!supabase) return false;

  const baseRow = {
    id: conversation.id,
    user_id: userId,
    title: conversation.title,
    preview: conversation.preview,
    pinned: Boolean(conversation.pinned),
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
  };

  // Try with folder/tags first (migration 20261122 applied). If the
  // columns do not exist yet, PostgREST reports the missing column
  // and we retry with the base row so sync keeps working.
  const { error: orgError } = await supabase
    .from("conversations")
    .upsert(
      {
        ...baseRow,
        folder: normalizeFolderName(conversation.folder),
        tags: normalizeTags(conversation.tags),
      },
      { onConflict: "id" }
    );

  if (!orgError) return true;

  const missingColumn =
    /folder|tags|column/i.test(orgError.message ?? "") ||
    orgError.code === "PGRST204";

  if (!missingColumn) {
    console.warn("Unable to sync conversation.", orgError);
    return false;
  }

  const { error } = await supabase
    .from("conversations")
    .upsert(baseRow, { onConflict: "id" });

  if (error) {
    console.warn("Unable to sync conversation.", error);
    return false;
  }

  return true;
}

export async function replaceMessages(
  userId: string,
  conversation: CloudConversation
): Promise<boolean> {
  if (!supabase) return false;

  const { error: deleteError } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversation.id)
    .eq("user_id", userId);

  if (deleteError) {
    console.warn("Unable to clear cloud messages.", deleteError);
    return false;
  }

  if (conversation.messages.length === 0) return true;

  // Insert with the migration-0002 columns; on an older schema retry
  // with the legacy shape so the sync still lands.
  const { error: insertError } = await supabase.from("messages").insert(
    conversation.messages.map((message) =>
      toMessageInsertRow(message, conversation.id, userId)
    )
  );

  if (insertError && isMissingColumnError(insertError)) {
    const { error: legacyError } = await supabase.from("messages").insert(
      conversation.messages.map((message) => ({
        id: message.id,
        conversation_id: conversation.id,
        user_id: userId,
        role: message.role,
        content: message.content,
        created_at: message.createdAt,
      }))
    );

    if (legacyError) {
      console.warn("Unable to sync cloud messages.", legacyError);
      return false;
    }
    return true;
  }

  if (insertError) {
    console.warn("Unable to sync cloud messages.", insertError);
    return false;
  }

  return true;
}

export async function syncConversation(
  userId: string,
  conversation: CloudConversation
): Promise<boolean> {
  const upserted = await upsertConversation(userId, conversation);
  if (!upserted) return false;
  return replaceMessages(userId, conversation);
}

export async function deleteCloudConversation(
  userId: string,
  conversationId: string
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (error) {
    console.warn("Unable to delete cloud conversation.", error);
  }
}

// ------------------------------------------------------------------ projects

function mapProjectRow(row: ProjectRow): CloudProject {
  return {
    id: row.id,
    name: row.name,
    framework: row.framework,
    files: Array.isArray(row.files) ? row.files : [],
    prompt: row.prompt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProjects(
  userId: string
): Promise<CloudProject[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, framework, files, prompt, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.warn("Unable to load cloud projects.", error);
    return null;
  }

  return (data as ProjectRow[]).map(mapProjectRow);
}

export async function insertProject(
  userId: string,
  project: {
    name: string;
    framework: string;
    files: CloudProject["files"];
    prompt?: string;
  }
): Promise<CloudProject | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: project.name,
      framework: project.framework,
      files: project.files,
      prompt: project.prompt ?? null,
    })
    .select("id, name, framework, files, prompt, created_at, updated_at")
    .single();

  if (error || !data) {
    console.warn("Unable to save project to the cloud.", error);
    return null;
  }

  return mapProjectRow(data as ProjectRow);
}

export async function updateProject(
  userId: string,
  projectId: string,
  project: {
    name: string;
    framework: string;
    files: CloudProject["files"];
    prompt?: string;
  }
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from("projects")
    .update({
      name: project.name,
      framework: project.framework,
      files: project.files,
      prompt: project.prompt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) {
    console.warn("Unable to update cloud project.", error);
    return false;
  }

  return true;
}

// ------------------------------------------------------------------ profiles

export async function fetchProfile(
  userId: string
): Promise<CloudProfile | null> {
  if (!supabase) return null;

  // Migration-0002 columns first; retry without them on an older schema.
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "email, display_name, custom_instructions, default_chat_mode, default_thinking"
    )
    .eq("id", userId)
    .maybeSingle();

  if (!error) {
    return data ? mapProfileRow(data as ProfileRow) : null;
  }

  if (!isMissingColumnError(error)) return null;

  const legacy = await supabase
    .from("profiles")
    .select("email, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (legacy.error || !legacy.data) return null;

  return mapProfileRow(legacy.data as ProfileRow);
}

export async function upsertProfile(
  userId: string,
  profile: CloudProfile
): Promise<boolean> {
  if (!supabase) return false;

  const baseRow = {
    id: userId,
    email: profile.email,
    display_name: profile.displayName,
    updated_at: new Date().toISOString(),
  };

  // Try with the migration-0002 columns first; on an older schema
  // retry with the base row so the profile save still lands.
  const { error: extendedError } = await supabase
    .from("profiles")
    .upsert(
      {
        ...baseRow,
        custom_instructions: profile.customInstructions ?? null,
        default_chat_mode: profile.defaultChatMode ?? "smart",
        default_thinking: profile.defaultThinking ?? "fast",
      },
      { onConflict: "id" }
    );

  if (!extendedError) return true;

  if (!isMissingColumnError(extendedError)) {
    console.warn("Unable to save profile.", extendedError);
    return false;
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(baseRow, { onConflict: "id" });

  if (error) {
    console.warn("Unable to save profile.", error);
    return false;
  }

  return true;
}

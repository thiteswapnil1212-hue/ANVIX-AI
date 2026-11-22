import { supabase } from "./client";
import { normalizeFolderName, normalizeTags } from "@/lib/chat-organization";

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
 */

export interface CloudMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

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

interface MessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
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

export async function fetchConversations(
  userId: string
): Promise<CloudConversation[] | null> {
  if (!supabase) return null;

  const { data: conversationRows, error } = await supabase
    .from("conversations")
    .select("id, title, preview, pinned, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !conversationRows) {
    console.warn("Unable to load cloud conversations.", error);
    return null;
  }

  const conversations = conversationRows as ConversationRow[];
  if (conversations.length === 0) return [];

  // Folders/tags live in the 20261122 migration. If it has not been
  // applied yet, this second query fails and we keep the base rows —
  // organization stays local-only instead of breaking cloud load.
  const { data: orgRows } = await supabase
    .from("conversations")
    .select("id, folder, tags")
    .eq("user_id", userId)
    .in(
      "id",
      conversations.map((conversation) => conversation.id)
    );
  const orgById = new Map<string, { folder?: string | null; tags?: string[] }>();
  for (const row of (orgRows ?? []) as {
    id: string;
    folder?: string | null;
    tags?: string[];
  }[]) {
    orgById.set(row.id, row);
  }
  for (const row of conversations) {
    const org = orgById.get(row.id);
    if (org) {
      row.folder = normalizeFolderName(org.folder);
      row.tags = normalizeTags(org.tags);
    }
  }

  const { data: messageRows, error: messagesError } = await supabase
    .from("messages")
    .select("id, conversation_id, role, content, created_at")
    .eq("user_id", userId)
    .in(
      "conversation_id",
      conversations.map((conversation) => conversation.id)
    )
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.warn("Unable to load cloud messages.", messagesError);
    return null;
  }

  const messagesByConversation = new Map<string, CloudMessage[]>();
  for (const row of (messageRows ?? []) as MessageRow[]) {
    const list = messagesByConversation.get(row.conversation_id) ?? [];
    list.push({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    });
    messagesByConversation.set(row.conversation_id, list);
  }

  return conversations.map((row) => ({
    id: row.id,
    title: row.title,
    preview: row.preview,
    pinned: row.pinned,
    folder: normalizeFolderName(row.folder),
    tags: normalizeTags(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: messagesByConversation.get(row.id) ?? [],
  }));
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

  const { error: insertError } = await supabase.from("messages").insert(
    conversation.messages.map((message) => ({
      id: message.id,
      conversation_id: conversation.id,
      user_id: userId,
      role: message.role,
      content: message.content,
      created_at: message.createdAt,
    }))
  );

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

// ------------------------------------------------------------------ profiles

export interface CloudProfile {
  email: string | null;
  displayName: string | null;
}

export async function fetchProfile(
  userId: string
): Promise<CloudProfile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("email, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    email: data.email as string | null,
    displayName: data.display_name as string | null,
  };
}

export async function upsertProfile(
  userId: string,
  profile: CloudProfile
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: profile.email,
      display_name: profile.displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.warn("Unable to save profile.", error);
    return false;
  }

  return true;
}

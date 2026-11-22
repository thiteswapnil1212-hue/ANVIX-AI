import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isShareLive,
  type ShareCommentRecord,
  type ShareRecord,
} from "./share.ts";

/**
 * Server-side share reads.
 *
 * These run with the service-role client, which bypasses RLS — so
 * every function here narrows to exactly one row by its unguessable
 * token (or by a share id already resolved from a token). Nothing in
 * this file ever lists shares. A missing `shares` table (SQL not run
 * yet) surfaces as "unavailable", not as a crash or an empty result.
 */

export type ShareLookup =
  | { status: "ok"; share: ShareRecord }
  | { status: "not_found" }
  | { status: "revoked_or_expired" }
  | { status: "unavailable" };

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.message?.includes("does not exist") === true
  );
}

function mapShareRow(row: Record<string, unknown>): ShareRecord {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    resource_type:
      row.resource_type === "project" ? "project" : "chat",
    resource_id: String(row.resource_id),
    token: String(row.token),
    permission: row.permission === "comment" ? "comment" : "view",
    expires_at: (row.expires_at as string | null) ?? null,
    revoked: Boolean(row.revoked),
    created_at: String(row.created_at),
  };
}

/** Look a share up by its exact token. Never lists, never guesses. */
export async function findLiveShare(
  client: SupabaseClient,
  token: string
): Promise<ShareLookup> {
  const { data, error } = await client
    .from("shares")
    .select(
      "id, owner_id, resource_type, resource_id, token, permission, expires_at, revoked, created_at"
    )
    .eq("token", token)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return { status: "unavailable" };
    console.warn("Unable to look up share.", error);
    return { status: "unavailable" };
  }

  if (!data) return { status: "not_found" };

  const share = mapShareRow(data as Record<string, unknown>);
  if (!isShareLive(share)) return { status: "revoked_or_expired" };
  return { status: "ok", share };
}

export interface SharedChat {
  id: string;
  title: string;
  preview: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
}

/** The one conversation a live share points at, with its messages. */
export async function loadSharedChat(
  client: SupabaseClient,
  share: ShareRecord
): Promise<SharedChat | null> {
  const { data: conversation, error } = await client
    .from("conversations")
    .select("id, title, preview")
    .eq("id", share.resource_id)
    .maybeSingle();

  if (error || !conversation) {
    if (error) console.warn("Unable to load shared chat.", error);
    return null;
  }

  const { data: messages, error: messagesError } = await client
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", share.resource_id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.warn("Unable to load shared chat messages.", messagesError);
    return null;
  }

  const row = conversation as Record<string, unknown>;
  return {
    id: String(row.id),
    title: String(row.title ?? "Shared chat"),
    preview: String(row.preview ?? ""),
    messages: ((messages ?? []) as Record<string, unknown>[]).map((message) => ({
      id: String(message.id),
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content),
      createdAt: String(message.created_at),
    })),
  };
}

export interface SharedProject {
  id: string;
  name: string;
  framework: string;
  files: Array<{ path: string; content: string; language: string }>;
  prompt: string | null;
}

/** The one generated project a live share points at. */
export async function loadSharedProject(
  client: SupabaseClient,
  share: ShareRecord
): Promise<SharedProject | null> {
  const { data, error } = await client
    .from("projects")
    .select("id, name, framework, files, prompt")
    .eq("id", share.resource_id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn("Unable to load shared project.", error);
    return null;
  }

  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    name: String(row.name ?? "Shared project"),
    framework: String(row.framework ?? "nextjs"),
    files: Array.isArray(row.files)
      ? (row.files as Record<string, unknown>[]).map((file) => ({
          path: String(file.path ?? ""),
          content: String(file.content ?? ""),
          language: String(file.language ?? ""),
        }))
      : [],
    prompt: (row.prompt as string | null) ?? null,
  };
}

/** Comments on a share, oldest first. Null when the table is missing. */
export async function listShareComments(
  client: SupabaseClient,
  shareId: string
): Promise<ShareCommentRecord[] | null> {
  const { data, error } = await client
    .from("share_comments")
    .select("id, share_id, author_user_id, author_name, body, created_at")
    .eq("share_id", shareId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return null;
    console.warn("Unable to load share comments.", error);
    return null;
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    share_id: String(row.share_id),
    author_user_id: (row.author_user_id as string | null) ?? null,
    author_name: String(row.author_name ?? "Guest"),
    body: String(row.body),
    created_at: String(row.created_at),
  }));
}

export async function addShareComment(
  client: SupabaseClient,
  input: {
    shareId: string;
    authorUserId: string | null;
    authorName: string;
    body: string;
  }
): Promise<ShareCommentRecord | null> {
  const { data, error } = await client
    .from("share_comments")
    .insert({
      share_id: input.shareId,
      author_user_id: input.authorUserId,
      author_name: input.authorName.trim().slice(0, 100) || "Guest",
      body: input.body.trim(),
    })
    .select("id, share_id, author_user_id, author_name, body, created_at")
    .single();

  if (error || !data) {
    console.warn("Unable to save share comment.", error);
    return null;
  }

  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    share_id: String(row.share_id),
    author_user_id: (row.author_user_id as string | null) ?? null,
    author_name: String(row.author_name ?? "Guest"),
    body: String(row.body),
    created_at: String(row.created_at),
  };
}

/** True when the abuse report was stored. */
export async function addShareReport(
  client: SupabaseClient,
  input: { shareId: string; reason: string }
): Promise<boolean> {
  const { error } = await client.from("share_reports").insert({
    share_id: input.shareId,
    reason: input.reason.trim(),
  });

  if (error) {
    console.warn("Unable to save share report.", error);
    return false;
  }
  return true;
}

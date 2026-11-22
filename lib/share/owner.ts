import type { SupabaseClient } from "@supabase/supabase-js";

import {
  expiryFromOption,
  generateShareToken,
  type ShareExpiryOption,
  type SharePermission,
  type ShareRecord,
  type ShareResourceType,
} from "./share";

/**
 * Owner-side share management, via the browser Supabase client.
 *
 * The owner-only RLS policies on `public.shares` do the access
 * control here: a caller can only ever create, list or revoke their
 * own rows. Every function returns null / false (never throws) when
 * Supabase is unconfigured or the shares table does not exist yet,
 * so the UI can show an honest "sharing unavailable" state.
 */

export interface CreateShareInput {
  ownerId: string;
  resourceType: ShareResourceType;
  resourceId: string;
  permission: SharePermission;
  expiry: ShareExpiryOption["id"];
}

/** Create a share link for one of the caller's own chats / projects. */
export async function createShare(
  client: SupabaseClient,
  input: CreateShareInput
): Promise<ShareRecord | null> {
  const { data, error } = await client
    .from("shares")
    .insert({
      owner_id: input.ownerId,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      token: generateShareToken(),
      permission: input.permission,
      expires_at: expiryFromOption(input.expiry),
      revoked: false,
    })
    .select(
      "id, owner_id, resource_type, resource_id, token, permission, expires_at, revoked, created_at"
    )
    .single();

  if (error || !data) {
    console.warn("Unable to create share.", error);
    return null;
  }

  return data as ShareRecord;
}

/** The caller's live + revoked shares for one resource, newest first. */
export async function listSharesForResource(
  client: SupabaseClient,
  ownerId: string,
  resourceType: ShareResourceType,
  resourceId: string
): Promise<ShareRecord[] | null> {
  const { data, error } = await client
    .from("shares")
    .select(
      "id, owner_id, resource_type, resource_id, token, permission, expires_at, revoked, created_at"
    )
    .eq("owner_id", ownerId)
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("Unable to list shares.", error);
    return null;
  }

  return data as ShareRecord[];
}

/** Revoke one of the caller's shares. The link stops working at once. */
export async function revokeShare(
  client: SupabaseClient,
  ownerId: string,
  shareId: string
): Promise<boolean> {
  const { error } = await client
    .from("shares")
    .update({ revoked: true })
    .eq("id", shareId)
    .eq("owner_id", ownerId);

  if (error) {
    console.warn("Unable to revoke share.", error);
    return false;
  }
  return true;
}

/** How many abuse reports a share has (owner view; 0 when unavailable). */
export async function countShareReports(
  client: SupabaseClient,
  shareId: string
): Promise<number> {
  const { count, error } = await client
    .from("share_reports")
    .select("id", { count: "exact", head: true })
    .eq("share_id", shareId);

  if (error) return 0;
  return count ?? 0;
}

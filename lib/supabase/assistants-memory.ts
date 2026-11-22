import { supabase } from "./client";
import {
  filterAssistantTools,
  parseAssistantMode,
  validateAssistantInput,
  validateCustomInstructions,
  type AssistantRecord,
  type AssistantInput,
} from "@/lib/assistants";
import { MAX_FACT_CHARS, type MemoryRecord } from "@/lib/memory";

/**
 * Cloud persistence for custom assistants, memories and the minimal
 * global custom-instructions setting (lib/supabase/cloud.ts pattern).
 *
 * Every function no-ops safely when Supabase is not configured OR
 * when the SQL from supabase/schema.sql has not been applied yet
 * (missing table/column): it logs a warning and returns null/false,
 * so guest mode and pre-migration deployments never break. Callers
 * treat null as "feature unavailable on this deployment", never as
 * an empty list the user can be misled by.
 */

interface AssistantRow {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  instructions: string;
  file_ids: unknown;
  tools_enabled: unknown;
  mode: string | null;
  is_public: boolean;
  share_token: string;
  created_at: string;
  updated_at: string;
}

interface MemoryRow {
  id: string;
  user_id: string;
  fact: string;
  source_chat_id: string | null;
  confidence: number;
  created_at: string;
  updated_at: string;
}

function mapAssistantRow(row: AssistantRow): AssistantRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description ?? "",
    instructions: row.instructions ?? "",
    fileIds: Array.isArray(row.file_ids)
      ? row.file_ids.filter((id): id is string => typeof id === "string")
      : [],
    toolsEnabled: filterAssistantTools(row.tools_enabled),
    mode: parseAssistantMode(row.mode),
    isPublic: row.is_public === true,
    shareToken: row.share_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMemoryRow(row: MemoryRow): MemoryRecord {
  return {
    id: row.id,
    fact: row.fact,
    sourceChatId: row.source_chat_id,
    confidence: Number(row.confidence ?? 0.5),
    createdAt: row.created_at,
  };
}

// --------------------------------------------------------------- assistants

export async function fetchAssistants(
  userId: string
): Promise<AssistantRecord[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("assistants")
    .select(
      "id, owner_id, name, description, instructions, file_ids, tools_enabled, mode, is_public, share_token, created_at, updated_at"
    )
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.warn("Unable to load assistants.", error);
    return null;
  }

  return (data as AssistantRow[]).map(mapAssistantRow);
}

export async function createAssistant(
  userId: string,
  input: AssistantInput
): Promise<AssistantRecord | null> {
  if (!supabase) return null;

  const validated = validateAssistantInput(input);
  if (!validated.ok || !validated.value) return null;

  const { data, error } = await supabase
    .from("assistants")
    .insert({
      owner_id: userId,
      name: validated.value.name,
      description: validated.value.description,
      instructions: validated.value.instructions,
      file_ids: validated.value.fileIds,
      tools_enabled: validated.value.toolsEnabled,
      mode: validated.value.mode,
      is_public: validated.value.isPublic,
    })
    .select(
      "id, owner_id, name, description, instructions, file_ids, tools_enabled, mode, is_public, share_token, created_at, updated_at"
    )
    .single();

  if (error || !data) {
    console.warn("Unable to save assistant.", error);
    return null;
  }

  return mapAssistantRow(data as AssistantRow);
}

export async function updateAssistant(
  userId: string,
  id: string,
  input: AssistantInput
): Promise<AssistantRecord | null> {
  if (!supabase) return null;

  const validated = validateAssistantInput(input);
  if (!validated.ok || !validated.value) return null;

  const { data, error } = await supabase
    .from("assistants")
    .update({
      name: validated.value.name,
      description: validated.value.description,
      instructions: validated.value.instructions,
      file_ids: validated.value.fileIds,
      tools_enabled: validated.value.toolsEnabled,
      mode: validated.value.mode,
      is_public: validated.value.isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", userId)
    .select(
      "id, owner_id, name, description, instructions, file_ids, tools_enabled, mode, is_public, share_token, created_at, updated_at"
    )
    .single();

  if (error || !data) {
    console.warn("Unable to update assistant.", error);
    return null;
  }

  return mapAssistantRow(data as AssistantRow);
}

export async function deleteAssistant(
  userId: string,
  id: string
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from("assistants")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId);

  if (error) {
    console.warn("Unable to delete assistant.", error);
    return false;
  }

  return true;
}

/** Public read for a share link — RLS allows select on public rows. */
export async function fetchPublicAssistantByShareToken(
  shareToken: string
): Promise<AssistantRecord | null> {
  if (!supabase || !shareToken) return null;

  const { data, error } = await supabase
    .from("assistants")
    .select(
      "id, owner_id, name, description, instructions, file_ids, tools_enabled, mode, is_public, share_token, created_at, updated_at"
    )
    .eq("share_token", shareToken)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn("Unable to load shared assistant.", error);
    return null;
  }

  return mapAssistantRow(data as AssistantRow);
}

// ----------------------------------------------------------------- memories

export async function fetchMemories(
  userId: string
): Promise<MemoryRecord[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("memories")
    .select("id, user_id, fact, source_chat_id, confidence, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    console.warn("Unable to load memories.", error);
    return null;
  }

  return (data as MemoryRow[]).map(mapMemoryRow);
}

export async function updateMemory(
  userId: string,
  id: string,
  fact: string
): Promise<boolean> {
  if (!supabase) return false;

  const cleaned = fact.trim().replace(/\s+/g, " ");
  if (cleaned.length < 4 || cleaned.length > MAX_FACT_CHARS) return false;

  const { error } = await supabase
    .from("memories")
    .update({ fact: cleaned, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.warn("Unable to update memory.", error);
    return false;
  }

  return true;
}

export async function deleteMemory(
  userId: string,
  id: string
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.warn("Unable to delete memory.", error);
    return false;
  }

  return true;
}

// ------------------------------------------------------ custom instructions
// Kept separate from upsertProfile in cloud.ts on purpose: the column
// only exists after the new SQL is applied, and a failed upsert would
// take the whole profile save down with it. These two functions fail
// alone and leave the profile intact.

export async function fetchCustomInstructions(
  userId: string
): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("custom_instructions")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn("Unable to load custom instructions.", error);
    return null;
  }

  const text = data.custom_instructions as string | null;
  return typeof text === "string" ? text : null;
}

export async function saveCustomInstructions(
  userId: string,
  value: string
): Promise<boolean> {
  if (!supabase) return false;

  const validated = validateCustomInstructions(value);
  if (!validated.ok) return false;

  const { error } = await supabase
    .from("profiles")
    .update({ custom_instructions: validated.value })
    .eq("id", userId);

  if (error) {
    console.warn("Unable to save custom instructions.", error);
    return false;
  }

  return true;
}

-- ANVIX AI — chat organization: folders, tags, full-text search, fork
-- Run in the Supabase SQL Editor AFTER the base supabase/schema.sql.
-- Safe to run twice (IF NOT EXISTS everywhere). Until this is applied,
-- the app keeps folders/tags local-only: the cloud layer in
-- lib/supabase/cloud.ts retries without these columns when they are
-- missing, so guest mode and old deployments never break.
--
-- Folders/tags are columns on the existing conversations rows.
-- Branching/forking needs no schema change: a fork is just a new
-- conversation row whose messages are copied up to the fork point.

alter table public.conversations
  add column if not exists folder text;

alter table public.conversations
  add column if not exists tags text[] not null default '{}'::text[];

-- Folders: filter chats by folder.
create index if not exists idx_conversations_user_folder
  on public.conversations (user_id, folder);

-- Tags: filter chats carrying a tag.
create index if not exists idx_conversations_tags
  on public.conversations using gin (tags);

-- Full-text search over chat titles/previews (server-side lane).
-- Message bodies are searched client-side over loaded chats; this
-- index covers the title/preview half for a future server query.
create index if not exists idx_conversations_title_preview_fts
  on public.conversations
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(preview, '')));

-- Full-text search over message bodies (server-side lane).
create index if not exists idx_messages_content_fts
  on public.messages
  using gin (to_tsvector('english', coalesce(content, '')));

-- No RLS change: folder/tags live on conversations, which already has
-- the "own rows" policy (auth.uid() = user_id).

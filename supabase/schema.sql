-- ANVIX AI — Supabase schema
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query.
-- Creates profiles, conversations, messages and projects with row-level
-- security so every user can only ever touch their own rows.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------ conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  preview text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  framework text not null default 'nextjs',
  files jsonb not null default '[]'::jsonb,
  prompt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_user_updated
  on public.conversations (user_id, updated_at desc);
create index if not exists idx_messages_conversation_created
  on public.messages (conversation_id, created_at asc);
create index if not exists idx_projects_user_updated
  on public.projects (user_id, updated_at desc);

-- ------------------------------------------------------- row-level security
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.projects enable row level security;

drop policy if exists "profiles: own row" on public.profiles;
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "conversations: own rows" on public.conversations;
create policy "conversations: own rows" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "messages: own rows" on public.messages;
create policy "messages: own rows" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "projects: own rows" on public.projects;
create policy "projects: own rows" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------- profile on new sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------- share links + collaboration
-- Run with the rest of this file on a fresh project, or run
-- supabase/migrations/20261122_shares_github.sql on an existing one.
--
-- Design note (read before changing): public share reads NEVER go
-- through row-level security. An anon SELECT policy on shares would
-- let anyone list every live token, so there is deliberately NO public
-- policy here. Public reads go through the server API routes
-- (/api/share/[token]) which use the service-role key and look a share
-- up by its exact token, then return only that one row and its one
-- resource. Owner create / revoke / list use the browser client under
-- the owner-only policies below.
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  resource_type text not null check (resource_type in ('chat', 'project')),
  resource_id uuid not null,
  token text not null unique,
  permission text not null default 'view' check (permission in ('view', 'comment')),
  expires_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.share_comments (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shares (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  author_name text not null default 'Guest',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.share_reports (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shares (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_shares_owner_created
  on public.shares (owner_id, created_at desc);
create index if not exists idx_shares_token
  on public.shares (token);
create index if not exists idx_share_comments_share_created
  on public.share_comments (share_id, created_at asc);
create index if not exists idx_share_reports_share_created
  on public.share_reports (share_id, created_at desc);

alter table public.shares enable row level security;
alter table public.share_comments enable row level security;
alter table public.share_reports enable row level security;

drop policy if exists "shares: owner only" on public.shares;
create policy "shares: owner only" on public.shares
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "share_comments: share owner reads" on public.share_comments;
create policy "share_comments: share owner reads" on public.share_comments
  for select using (
    exists (
      select 1 from public.shares
      where shares.id = share_comments.share_id
        and shares.owner_id = auth.uid()
    )
  );

drop policy if exists "share_comments: share owner deletes" on public.share_comments;
create policy "share_comments: share owner deletes" on public.share_comments
  for delete using (
    exists (
      select 1 from public.shares
      where shares.id = share_comments.share_id
        and shares.owner_id = auth.uid()
    )
  );

drop policy if exists "share_reports: share owner reads" on public.share_reports;
create policy "share_reports: share owner reads" on public.share_reports
  for select using (
    exists (
      select 1 from public.shares
      where shares.id = share_reports.share_id
        and shares.owner_id = auth.uid()
    )
  );


-- ANVIX AI - migration 20261122: share links + collaboration
-- Run this file in the Supabase SQL Editor on an existing project.
-- (Fresh projects get the same tables from supabase/schema.sql.)
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


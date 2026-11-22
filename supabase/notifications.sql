-- ANVIX AI — notifications tables (Web Push + Telegram)
-- Run this in your Supabase project: Dashboard -> SQL Editor -> New query.
-- Safe to run more than once (all statements are IF NOT EXISTS / OR REPLACE).
-- The app tolerates these tables being absent: the push/subscribe and
-- Telegram routes answer 503 "notifications not set up yet" instead of
-- crashing, and the Settings UI says so honestly.

-- ------------------------------------------------------- push_subscriptions
-- One row per (user, browser endpoint). A user on two browsers has two
-- rows; a re-subscribe overwrites the keys for the same endpoint.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions: own rows" on public.push_subscriptions;
create policy "push_subscriptions: own rows" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

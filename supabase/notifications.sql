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

-- ------------------------------------------------------------ telegram_links
-- One Telegram chat per ANVIX user. chat_id is text (Telegram ids are
-- 64-bit; storing them as text avoids JS number-precision surprises).
-- A chat can belong to only one account: linking the same Telegram
-- account to a second ANVIX account moves the link.
create table if not exists public.telegram_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  chat_id text not null unique,
  chat_username text,
  linked_at timestamptz not null default now()
);

-- ------------------------------------------------------- telegram_link_codes
-- Short-lived codes the user types (or taps) into the bot to link their
-- Telegram account. Codes are single-use and expire after 10 minutes.
create table if not exists public.telegram_link_codes (
  code text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_telegram_link_codes_user
  on public.telegram_link_codes (user_id);

alter table public.telegram_links enable row level security;
alter table public.telegram_link_codes enable row level security;

drop policy if exists "telegram_links: own row" on public.telegram_links;
create policy "telegram_links: own row" on public.telegram_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "telegram_link_codes: own rows" on public.telegram_link_codes;
create policy "telegram_link_codes: own rows" on public.telegram_link_codes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------- link_telegram_account() (RPC)
-- The Telegram webhook has no user token, so it cannot write these tables
-- under RLS. This SECURITY DEFINER function is the one privileged path:
-- it consumes a valid, unused, unexpired code and links the chat. It
-- never returns anything about other users, and an invalid code returns
-- NULL instead of an error (so the webhook cannot probe for valid codes).
create or replace function public.link_telegram_account(
  p_code text,
  p_chat_id text,
  p_chat_username text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.telegram_link_codes
  where code = p_code
    and used_at is null
    and expires_at > now();

  if v_user_id is null then
    return null;
  end if;

  update public.telegram_link_codes
  set used_at = now()
  where code = p_code;

  -- One Telegram account links to one ANVIX account: move the link if
  -- this chat was linked to someone else before.
  delete from public.telegram_links where chat_id = p_chat_id;

  insert into public.telegram_links (user_id, chat_id, chat_username)
  values (v_user_id, p_chat_id, p_chat_username)
  on conflict (user_id) do update set
    chat_id = excluded.chat_id,
    chat_username = excluded.chat_username,
    linked_at = now();

  return v_user_id;
end;
$$;

grant execute on function public.link_telegram_account(text, text, text)
  to anon, authenticated;

-- The bot-side /unlink command has no user token either, so it gets the
-- same privileged path: delete the link for this chat id, nothing else.
create or replace function public.unlink_telegram_account(p_chat_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.telegram_links where chat_id = p_chat_id;
end;
$$;

grant execute on function public.unlink_telegram_account(text)
  to anon, authenticated;

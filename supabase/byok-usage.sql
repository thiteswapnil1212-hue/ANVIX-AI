-- ANVIX AI — BYOK keys + usage aggregates (run AFTER supabase/schema.sql)
-- ---------------------------------------------------------------------------
-- HOW TO APPLY
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file
--   -> Run. Safe to re-run: every statement is IF NOT EXISTS / OR REPLACE.
--
-- WHAT IT CREATES
--   1. public.user_api_keys — one encrypted Gemini key per user (BYOK).
--      The key is stored AES-256-GCM encrypted by the server (see
--      lib/byok/crypto.ts); the plaintext key NEVER reaches this table.
--      Only the last 4 characters are stored in clear, for display.
--   2. public.usage_events — HOURLY aggregates, one row per caller +
--      scope + hour. Requests are counted in memory and flushed as an
--      increment to this row (see lib/usage/meter.ts). Individual
--      requests are never stored — no prompts, no IPs in clear beyond
--      the rate-limit caller key, no per-request rows.
--   3. public.increment_usage(...) — atomic upsert used by the flush.
--
-- IF THIS FILE HAS NOT BEEN RUN YET, the app still works: every code
-- path that reads these tables treats "table missing" as "no stored key
-- / no recorded usage" and falls back to the shared server key and the
-- in-memory rate-limiter counts. Run the SQL to switch BYOK and the
-- durable quota meter on.
--
-- ENV (server, Vercel -> Settings -> Environment Variables)
--   BYOK_ENCRYPTION_KEY — 32+ random characters (generate with e.g.
--     `openssl rand -base64 32`). Without it the Settings BYOK section
--     honestly reports "not configured" and refuses to store a key.
--     Rotating this value makes previously stored keys undecryptable;
--     users must re-enter their key afterwards.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------ BYOK keys
create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  provider text not null default 'gemini'
    check (provider in ('gemini')),
  -- AES-256-GCM envelope (base64), see lib/byok/crypto.ts. Never plaintext.
  encrypted_key text not null,
  -- Last 4 chars of the key, for "…wXYZ" display only.
  key_last4 text not null default '',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------- usage aggregates
-- caller_key is the rate-limit caller identity, e.g. "user:<uuid>" or
-- "ip:<address>" (see lib/usage/meter.ts). One row per caller + scope +
-- hour; request_count is incremented, never one row per request.
create table if not exists public.usage_events (
  caller_key text not null,
  scope text not null
    check (scope in ('chat', 'build', 'agent', 'generate')),
  hour_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (caller_key, scope, hour_start)
);

create index if not exists idx_usage_events_caller_hour
  on public.usage_events (caller_key, hour_start desc);

-- ------------------------------------------------------- row-level security
alter table public.user_api_keys enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists "user_api_keys: own row" on public.user_api_keys;
create policy "user_api_keys: own row" on public.user_api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Usage rows are readable by their own caller only. Signed-in users see
-- rows keyed "user:<their id>"; guest rows ("ip:...") are not readable
-- through the anon key — the server reads them with its own client and
-- the /api/usage route only ever returns the caller's own aggregate.
drop policy if exists "usage_events: own rows" on public.usage_events;
create policy "usage_events: own rows" on public.usage_events
  for select using (caller_key = 'user:' || auth.uid()::text);

-- ------------------------------------------------- atomic hourly increment
create or replace function public.increment_usage(
  p_caller_key text,
  p_scope text,
  p_hour_start timestamptz,
  p_count integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usage_events
    (caller_key, scope, hour_start, request_count, updated_at)
  values (p_caller_key, p_scope, p_hour_start, p_count, now())
  on conflict (caller_key, scope, hour_start)
  do update set
    request_count = public.usage_events.request_count + excluded.request_count,
    updated_at = now();
end;
$$;

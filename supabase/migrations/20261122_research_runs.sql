-- ANVIX AI — Deep research runs (scoped version, report §5)
--
-- Run this once in your Supabase project: Dashboard -> SQL Editor ->
-- New query. It mirrors the `research_runs` section appended to
-- `supabase/schema.sql` (fresh installs get it from there); this file
-- is for databases created before that section existed.
--
-- A run is chunked across short requests (one Gemini call per
-- `advance`), so all state lives here: the plan, per-step notes,
-- collected sources, steering direction, and the finished report.
-- If this table is missing, the /api/research routes answer 503
-- with a pointer to this file instead of crashing — research is
-- unusable until it is applied, everything else keeps working.

create table if not exists public.research_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  status text not null default 'queued'
    check (status in (
      'queued', 'planning', 'searching', 'synthesizing',
      'done', 'failed', 'cancelled'
    )),
  plan jsonb not null default '[]'::jsonb,
  step_index integer not null default 0,
  notes jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  direction text,
  report_markdown text,
  error text,
  steps_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_research_runs_user_created
  on public.research_runs (user_id, created_at desc);

alter table public.research_runs enable row level security;

drop policy if exists "research_runs: own rows" on public.research_runs;
create policy "research_runs: own rows" on public.research_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

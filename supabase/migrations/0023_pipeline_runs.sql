-- 0023_pipeline_runs.sql
--
-- STATUS: APPLIED 2026-10-03, by hand in the Supabase SQL editor. Verified the
-- same day from the admin page: the partial unique index answered a second
-- concurrent insert with 23505 (the page showed it as 409), and clear-stuck
-- flipped a backdated running row to abandoned.
--
-- One row per run of a post-scrape maintenance step started from the admin
-- Pipeline page (/admin/pipeline). The four steps are the lib/pipeline/*
-- functions that used to be run only from the terminal: seed, prepass,
-- classify and refresh. The page reads this table (through
-- /api/admin/pipeline/status) to show what ran, what it did, and whether
-- something is running right now.
--
-- ── THE LOCK ───────────────────────────────────────────────────────────────
--
-- Two steps must never run at once: two classifies would both select the same
-- unclassified rows and pay the Anthropic API twice, and a seed under a
-- running refresh would hand it a half-updated creators_count. The partial
-- unique index below allows at most ONE row with status = 'running' across
-- ALL steps. /api/admin/pipeline/run inserts its row first and treats 23505
-- as "something is already running" (409), so a double-click cannot start a
-- second run — the database decides, not a read-then-write check.
--
-- The index is on `status` itself, restricted to status = 'running': every
-- qualifying row has the same value, so uniqueness means at most one row.
--
-- ── STUCK RUNS ─────────────────────────────────────────────────────────────
--
-- The work runs inside the Next process on the VPS (after() from next/server),
-- and that process is not supervised: a deploy's `fuser -k 30001/tcp` kills a
-- run mid-flight and nothing finalises its row. It stays 'running' and holds
-- the lock. /api/admin/pipeline/clear-stuck marks such a row 'abandoned', but
-- only once it is older than 20 minutes, so a live run cannot be cleared by
-- an impatient click. 'abandoned' is terminal, like 'done' and 'failed'.
--
-- ── WHAT WRITES HERE ───────────────────────────────────────────────────────
--
-- Only the three routes under app/api/admin/pipeline/, all service_role. RLS
-- is enabled with NO policies: the anon and authenticated roles get zero
-- rows, and the admin page reads through the status route, not through a
-- browser query. Same lockdown as creator_dashboard_events (0020).
--
-- `progress` holds the last non-transient progress message from the step,
-- written at most once every 2 seconds while the run is live. `result` is the
-- step's result object (lib/pipeline/*: SeedResult, PrepassResult,
-- ClassifyResult, RefreshResult minus its `rows`). `options` is what the
-- caller passed (today only { dryRun } for refresh). `triggered_by` is the
-- admin's auth user id.

create table if not exists pipeline_runs (
  id            uuid primary key default gen_random_uuid(),
  step          text not null check (step in ('seed', 'prepass', 'classify', 'refresh')),
  status        text not null check (status in ('running', 'done', 'failed', 'abandoned')),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  duration_ms   integer,
  options       jsonb,
  result        jsonb,
  error         text,
  progress      text,
  triggered_by  uuid
);

create unique index if not exists pipeline_runs_one_running
  on pipeline_runs (status)
  where status = 'running';

create index if not exists idx_pipeline_runs_started_at
  on pipeline_runs (started_at desc);

alter table pipeline_runs enable row level security;

comment on table pipeline_runs is
  'One row per admin-triggered run of a lib/pipeline step (seed, prepass, classify, refresh). Service-role only; the partial unique index on status = running is the lock that allows one run at a time.';
comment on column pipeline_runs.progress is
  'Last non-transient onProgress message from the step, updated at most every 2 seconds while status = running.';
comment on column pipeline_runs.result is
  'The step''s result object from lib/pipeline/* (refresh minus its rows array). NULL until status = done.';
comment on column pipeline_runs.status is
  'running → done | failed, or abandoned when an admin cleared a run older than 20 minutes that a process restart had orphaned.';

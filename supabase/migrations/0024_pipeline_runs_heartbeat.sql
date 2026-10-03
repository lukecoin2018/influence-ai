-- 0024_pipeline_runs_heartbeat.sql
--
-- STATUS: NOT YET APPLIED. Apply by hand in the Supabase SQL editor, then
-- update this header with the date.
--
-- Adds heartbeat_at to pipeline_runs (0023). The progress recorder in
-- lib/admin/pipeline-runs.ts stamps it on every throttled progress write
-- (at most one every 2 seconds), so a run that is still reporting progress
-- keeps it fresh.
--
-- ── WHY ────────────────────────────────────────────────────────────────────
--
-- The stale rule used to be "started_at older than 20 minutes". That was
-- right for seed, prepass and refresh, which finish in seconds to a couple of
-- minutes, and wrong for classify, which spends one Anthropic call per 50
-- aliases and can legitimately run for much longer than 20 minutes. Under
-- the old rule a healthy classify would be shown as stuck, with a button
-- that would mark it abandoned while it was still writing rows.
--
-- The rule is now: coalesce(heartbeat_at, started_at) older than 20 minutes,
-- in /api/admin/pipeline/status (the warning) and /api/admin/pipeline/
-- clear-stuck (the guard). A run that is still writing progress can never
-- be cleared; a run whose process was killed stops writing and becomes
-- clearable 20 minutes after its last write.
--
-- The column is nullable and unset for the three fast steps' early phase and
-- for every row written before this migration, which is why the rule
-- coalesces to started_at. Code tolerates the column being absent: the
-- recorder retries a progress write without heartbeat_at if PostgREST
-- reports the column missing, and the run row is read with select('*').

alter table pipeline_runs add column if not exists heartbeat_at timestamptz;

comment on column pipeline_runs.heartbeat_at is
  'Stamped on every throttled progress write while status = running. The stale rule is coalesce(heartbeat_at, started_at) older than 20 minutes.';

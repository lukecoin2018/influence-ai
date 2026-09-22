-- 0020_creator_dashboard_events.sql
--
-- STATUS: APPLIED 2026-09-15/16, by hand in the Supabase SQL editor.
--
-- Post-claim dashboard usage: one row per event a verified (or, for
-- dashboard_opened only, pending/rejected) creator triggers inside
-- /creator-dashboard. Exists because funnel_events stops at `verified` plus
-- the three outreach events, so nothing recorded whether creators come back
-- after approval, which pages they use, or whether the approval email and the
-- nudge lead anywhere.
--
-- Deliberately a NEW table, not more funnel_events rows. That table is the
-- pre-claim funnel, its event_type CHECK has to be widened by migration every
-- time, and post-claim usage is a different question with a different join key.
-- Here event_type is constrained by the TypeScript union in
-- lib/dashboard/events.ts, NOT by a DB CHECK, so adding an event later is a
-- code change only. The union is the whitelist; the route refuses anything
-- outside it with a 400 before any insert.
--
-- Event types and their `details` keys (also in CLAUDE.md, "Dashboard events"):
--   dashboard_opened      {}
--   brands_hiring_opened  {}
--   brand_card_action     { canonical_name, platform, action }
--   tool_opened           { tool }
--   tool_used             { tool, + one or two enum/count facts per tool }
--   media_kit_opened      {}
--   media_kit_uploaded    { file_type, size_kb }
--   profile_edited        { fields_changed: string[] }
-- No PII in details, ever: no emails, names, free text or brand contact data.
-- Brand canonical names and creator profile ids are fine.
--
-- Writes are service-role only, from app/api/creator/events/route.ts, which
-- validates the caller's session and resolves their own creator_profiles row
-- first. The route also enforces a 2-second per-profile, per-type dedupe so a
-- double mount produces one row.
--
-- FK with ON DELETE CASCADE, unlike funnel_events (0011) and
-- creator_brand_outreach (0012), which avoided FKs because their rows are
-- written off the request path. Here the route has already proven the profile
-- exists before it writes, so the FK can only fail in a race with a profile
-- deletion, and the writer swallows that. Cascade is wanted: a deleted account
-- should take its usage rows with it.
--
-- RLS: enabled. Anon and authenticated get NO insert/update/delete policy
-- (service role only, same lockdown as 0011/0012). The ONE policy is an
-- admin-only SELECT, so /admin/creators can read v_creator_engagement from
-- the browser under the admin's session. is_admin_user() is the same
-- predicate 0001, 0004 and 0017 use.
--
-- The view is security_invoker = true, same as v_brand_partnerships (0001):
-- a default view runs as its owner, bypasses RLS and would be readable by
-- anyone holding the anon key, which is the v_creator_summary leak class.
-- With security_invoker, a non-admin session gets zero rows, not an error.
--
-- No migration runner exists in this repo — apply manually via the Supabase
-- SQL editor, same as 0001-0019. Idempotent: safe to rerun (IF NOT EXISTS,
-- DROP POLICY IF EXISTS, CREATE OR REPLACE VIEW).

create table if not exists creator_dashboard_events (
  id                 uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references creator_profiles(id) on delete cascade,
  event_type         text not null,
  details            jsonb not null default '{}',
  created_at         timestamptz not null default now()
);

-- "What did this creator do, most recent first" and the dedupe read in the
-- route (latest row for one profile + type).
create index if not exists idx_creator_dashboard_events_profile_created
  on creator_dashboard_events (creator_profile_id, created_at desc);

-- "How many tool_used this week" — count by type over a date range.
create index if not exists idx_creator_dashboard_events_type_created
  on creator_dashboard_events (event_type, created_at desc);

alter table creator_dashboard_events enable row level security;

drop policy if exists admins_can_read_dashboard_events on creator_dashboard_events;
create policy admins_can_read_dashboard_events
  on creator_dashboard_events for select to authenticated
  using (is_admin_user());

comment on table creator_dashboard_events is
  'Post-claim creator dashboard usage, one row per event. event_type is constrained by the TypeScript union in lib/dashboard/events.ts, not a CHECK. Written only by app/api/creator/events/route.ts as service_role after validating the session. RLS: no write policy for anon/authenticated; one admin-only SELECT policy for /admin/creators. No PII in details.';
comment on column creator_dashboard_events.creator_profile_id is
  'creator_profiles.id, i.e. the auth user id. FK with cascade: the route proves the profile exists before writing.';
comment on column creator_dashboard_events.details is
  'Per-type keys listed in lib/dashboard/events.ts; unknown keys are stripped and the whole object is dropped over 2 KB. Never PII.';

-- One row per creator who has produced at least one event. claim_status and
-- claimed_at are joined in so "who came back after approval" is a one-liner:
--   select * from v_creator_engagement where last_event_at > claimed_at;
-- distinct_days counts UTC calendar days.
create or replace view v_creator_engagement
  with (security_invoker = true)
as
select
  e.creator_profile_id,
  cp.claim_status,
  cp.claimed_at,
  min(e.created_at)                                             as first_event_at,
  max(e.created_at)                                             as last_event_at,
  count(*)                                                      as event_count,
  count(distinct (e.created_at at time zone 'utc')::date)       as distinct_days,
  bool_or(e.event_type = 'dashboard_opened')                    as has_dashboard_opened,
  bool_or(e.event_type = 'brands_hiring_opened')                as has_brands_hiring_opened,
  bool_or(e.event_type = 'brand_card_action')                   as has_brand_card_action,
  bool_or(e.event_type = 'tool_opened')                         as has_tool_opened,
  bool_or(e.event_type = 'tool_used')                           as has_tool_used,
  bool_or(e.event_type = 'media_kit_opened')                    as has_media_kit_opened,
  bool_or(e.event_type = 'media_kit_uploaded')                  as has_media_kit_uploaded,
  bool_or(e.event_type = 'profile_edited')                      as has_profile_edited
from creator_dashboard_events e
join creator_profiles cp on cp.id = e.creator_profile_id
group by e.creator_profile_id, cp.claim_status, cp.claimed_at;

comment on view v_creator_engagement is
  'Per-creator rollup of creator_dashboard_events with claim_status and claimed_at joined from creator_profiles. security_invoker: readable only by sessions that can read both tables (admins). "Came back after approval" = last_event_at > claimed_at.';

-- ── VERIFICATION ───────────────────────────────────────────────────────────
-- After applying:
--   select policyname, cmd, roles from pg_policies where tablename = 'creator_dashboard_events';
-- expect exactly one row: admins_can_read_dashboard_events | SELECT | {authenticated}.
--   select * from v_creator_engagement;
-- is empty until the first event arrives, and stays empty for a non-admin
-- session even after that.

-- 0021_v_creator_engagement_counts.sql
--
-- STATUS: APPLIED 2026-09-15/16, by hand in the Supabase SQL editor. The code
-- that reads the new columns (app/admin/creators/page.tsx) selects `*` from the
-- view and treats a missing n_* column as 0, so it rendered correctly before
-- this was applied as well as after.
--
-- Adds one integer count per event type to v_creator_engagement (0020), so
-- /admin/creators can show a per-type breakdown under "Last active" without
-- a second query. Every existing column, its position and its type are kept,
-- and the new columns are appended at the END — CREATE OR REPLACE VIEW
-- refuses to drop, rename, retype or reorder existing columns, and only
-- accepts new ones after the last existing one.
--
-- security_invoker = true is kept for the same reason as in 0020: a default
-- view would run as its owner and bypass the admin-only SELECT policy on the
-- underlying table.
--
-- A NEW EVENT TYPE NEEDS A NEW n_<type> (and has_<type>) COLUMN HERE for the
-- count line to include it; the admin activity list reads the table directly
-- and renders any type without a change. event_count and last_event_at also
-- include it regardless.
--
-- No migration runner exists in this repo — apply manually via the Supabase
-- SQL editor, same as 0001-0020. Idempotent: CREATE OR REPLACE.

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
  bool_or(e.event_type = 'profile_edited')                      as has_profile_edited,
  (count(*) filter (where e.event_type = 'dashboard_opened'))::int      as n_dashboard_opened,
  (count(*) filter (where e.event_type = 'brands_hiring_opened'))::int  as n_brands_hiring_opened,
  (count(*) filter (where e.event_type = 'brand_card_action'))::int     as n_brand_card_action,
  (count(*) filter (where e.event_type = 'tool_opened'))::int           as n_tool_opened,
  (count(*) filter (where e.event_type = 'tool_used'))::int             as n_tool_used,
  (count(*) filter (where e.event_type = 'media_kit_opened'))::int      as n_media_kit_opened,
  (count(*) filter (where e.event_type = 'media_kit_uploaded'))::int    as n_media_kit_uploaded,
  (count(*) filter (where e.event_type = 'profile_edited'))::int        as n_profile_edited
from creator_dashboard_events e
join creator_profiles cp on cp.id = e.creator_profile_id
group by e.creator_profile_id, cp.claim_status, cp.claimed_at;

comment on view v_creator_engagement is
  'Per-creator rollup of creator_dashboard_events with claim_status and claimed_at joined from creator_profiles. has_<type> booleans and n_<type> integer counts per event type (0021). security_invoker: readable only by sessions that can read both tables (admins). "Came back after approval" = last_event_at > claimed_at. A new event type needs a new has_/n_ column here.';

-- ── VERIFICATION ───────────────────────────────────────────────────────────
--   select column_name from information_schema.columns
--   where table_name = 'v_creator_engagement' order by ordinal_position;
-- expect 23 rows, the eight n_* columns last.

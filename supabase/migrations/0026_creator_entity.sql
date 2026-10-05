-- 0026_creator_entity.sql
--
-- STATUS: APPLIED 2026-10-05, by hand in the Supabase SQL editor, one
-- statement at a time. The two `drop policy if exists` statements were
-- skipped because the table was new; the inputs comment went in with the
-- "skips the model call" wording below. Verified there: to_regclass returns
-- creator_entity and pg_policies shows the two admin policies.
--
-- What kind of ACCOUNT each scraped creator is: creator, brand, media, venue
-- or other. Some brand accounts (GLOWERY, Rel Beauty, Cosmopolitan UK, W
-- Amsterdam, ...) were scraped as if they were creators. The brand_aliases
-- join cannot find them: lib/pipeline/prepass.ts labels any alias equal to a
-- social_profiles.handle as 'creator', so for those handles the join is
-- circular, and most brand accounts have no alias row at all (measured
-- 2026-10-04: 2 brand + 1 media matches among 8,716 profiles).
--
-- Written by scripts/creator-entity/classify.ts (lib/creator-entity/*) as
-- service_role: a Claude classification per creator plus deterministic
-- heuristic flags stored alongside it. Read and reviewed by
-- /admin/creator-review. PHASE 1 ONLY: nothing else reads this table, and no
-- public or brand-facing surface changes because of it. Excluding
-- non-creators is phase 2 (creators.status = 'non_creator').
--
-- ── Why a side table, not a column on creators ─────────────────────────────
--
-- creators is mirrored by creators_archive (LIKE ... INCLUDING ALL), unioned
-- with an explicit column list in v_creators_all, and promote_creator() pins
-- its column count at 35. A new creators column trips all three (see
-- influ-scrape supabase/migrations/20260827000001 and 20260827000003). A side
-- table keyed on creator_id touches none of them.
--
-- ── Columns ────────────────────────────────────────────────────────────────
--
-- The effective type is coalesce(review_entity_type, entity_type): a human
-- override always wins, and the script's upsert never writes the two review
-- columns, so re-classifying a creator cannot undo a review.
--
-- inputs is the exact record sent to the model (platform, handle,
-- display_name, follower_count as a JSON number, bio, category, business
-- flag, link domain, truncated summary). input_hash is sha256 over it; a run
-- skips the MODEL CALL for a creator whose stored input_hash AND
-- prompt_version both match, but still recomputes its signals and flag_count
-- and rewrites them when they differ, so heuristics can be retuned without
-- paying for the model again. The review page reads everything it shows from
-- inputs, so it never touches
-- social_profiles or v_creator_summary — both of which will hide these rows
-- from the admin session once phase 2 sets status = 'non_creator'.
--
-- signals holds the heuristic flags (booleans at the top level) and the text
-- each one matched (signals.matches). flag_count is the number of true
-- non-creator flags, NOT counting ig_business or creator_category; it is a
-- real column only because the review page filters on it ("a creator verdict
-- with 2+ flags") and PostgREST cannot count inside a jsonb object.
--
-- No indexes beyond the primary key: the review page's filters and its
-- follower sort run over ~8.7k rows.
--
-- ── RLS ────────────────────────────────────────────────────────────────────
--
-- Same pattern as brand_aliases (0001): enabled, with an admin-only SELECT
-- and an admin-only UPDATE policy on is_admin_user(). No INSERT or DELETE
-- policy — the script writes as service_role. No anon or public access.
--
-- No migration runner exists in this repo — apply manually via the Supabase
-- SQL editor, same as 0001-0025. Idempotent: safe to rerun.

create table if not exists creator_entity (
  creator_id         uuid primary key references creators(id) on delete cascade,
  entity_type        text not null
                       check (entity_type in ('creator', 'brand', 'media', 'venue', 'other')),
  confidence         text not null
                       check (confidence in ('high', 'medium', 'low')),
  reason             text not null,
  signals            jsonb not null default '{}',
  flag_count         smallint not null default 0,
  inputs             jsonb not null,
  model              text,
  prompt_version     text,
  input_hash         text,
  classified_at      timestamptz,
  review_entity_type text
                       check (review_entity_type in ('creator', 'brand', 'media', 'venue', 'other')),
  reviewed_at        timestamptz
);

alter table creator_entity enable row level security;

drop policy if exists "Admins can view creator_entity" on creator_entity;

create policy "Admins can view creator_entity"
  on creator_entity for select
  to authenticated
  using (is_admin_user());

drop policy if exists "Admins can update creator_entity" on creator_entity;

create policy "Admins can update creator_entity"
  on creator_entity for update
  to authenticated
  using (is_admin_user())
  with check (is_admin_user());

comment on table creator_entity is
  'What kind of account each scraped creator is (creator / brand / media / venue / other): a Claude verdict plus heuristic flags, written by scripts/creator-entity/classify.ts as service_role and reviewed in /admin/creator-review. Effective type = coalesce(review_entity_type, entity_type). RLS: admin-only SELECT and UPDATE; no anon or public access.';

comment on column creator_entity.inputs is
  'The exact record sent to the model. input_hash is sha256 over it; a run skips the model call for rows whose input_hash and prompt_version both match (their signals and flag_count are still refreshed). The review page displays from this, not from social_profiles.';

comment on column creator_entity.flag_count is
  'Number of true non-creator heuristic flags in signals, excluding ig_business and creator_category. Written with signals by the script.';

comment on column creator_entity.review_entity_type is
  'Human override from /admin/creator-review. Wins over entity_type. Never written by the classification script.';

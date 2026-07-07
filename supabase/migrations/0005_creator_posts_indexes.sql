-- Indexes for the query shapes lib/reports/brand-activity.ts, engagement.ts,
-- and matching.ts run against creator_posts:
--
--   .overlaps('detected_brands', aliases).eq('is_sponsored', true)
--     -- getBrandActivity(), rankCandidatesByCreatorCount() (brand-activity.ts)
--   .in('social_profile_id', profileIds)
--     -- scoreProfilesByMedianEngagement() (engagement.ts) — no is_sponsored
--     -- filter here; this scores a profile's *entire* post history, not just
--     -- sponsored posts, so social_profile_id alone (no partial condition)
--     -- is what this lookup needs.
--
-- Without a GIN index, `&&` (overlaps) on an array column forces a sequential
-- scan of all 69k+ rows in creator_posts for every brand looked up — this is
-- almost certainly the "sequential scan" load source: it ran up to ~40 times
-- per uncached /report/[slug] request before the suggestCompetitors()
-- rewrite in this same change, and still runs at least once per request
-- after it (Tier 1 + up to 3 Tier 2 competitors).
--
-- Not verified against EXPLAIN ANALYZE — no SQL/psql access in this
-- environment, only the Supabase REST API via anon/service-role keys. These
-- are the standard, low-risk indexes for these exact access patterns
-- regardless; if you want to confirm the sequential scan directly, run
-- `EXPLAIN ANALYZE select 1 from creator_posts where detected_brands && '{aybl}'
-- and is_sponsored` before and after applying this file.
--
-- No migration runner exists in this repo — apply this file manually via the
-- Supabase SQL editor, same as 0001-0004. Idempotent: safe to rerun
-- (IF NOT EXISTS throughout). Not CONCURRENTLY — Supabase's SQL editor runs
-- statements in a transaction block, which CREATE INDEX CONCURRENTLY can't
-- run inside; a plain CREATE INDEX briefly locks writes to creator_posts,
-- acceptable for this table's size and write pattern (append-only via the
-- scraping pipeline, not user-facing writes).

create index if not exists idx_creator_posts_detected_brands_gin
  on creator_posts using gin (detected_brands);

create index if not exists idx_creator_posts_social_profile_id
  on creator_posts (social_profile_id);

-- Speeds up the common combination (brand lookup + sponsored-only filter)
-- beyond what the GIN index alone covers — the planner can bitmap-AND this
-- with the GIN index scan instead of rechecking is_sponsored row-by-row.
create index if not exists idx_creator_posts_sponsored_profile
  on creator_posts (social_profile_id)
  where is_sponsored = true;

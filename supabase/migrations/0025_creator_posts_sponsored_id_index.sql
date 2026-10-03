-- 0025_creator_posts_sponsored_id_index.sql
--
-- STATUS: NOT YET APPLIED. Apply by hand in the Supabase SQL editor, then
-- update this header with the date. Optional but recommended; nothing breaks
-- without it, one query stays slow (see below).
--
-- Partial index on creator_posts (id) WHERE is_sponsored = true, for the
-- keyset scan in lib/pipeline/refresh.ts:
--
--   select … from creator_posts
--   where is_sponsored = true and id > $last
--   order by id limit 1000
--
-- Measured on 2026-10-03 without this index: the FIRST page of that scan
-- took 5.9 seconds (the planner reads every sponsored row through the
-- existing partial index on social_profile_id, then sorts by id), and under
-- concurrent load it hit the statement timeout. Deeper pages took 1.2 s.
-- With an index on (id) restricted to sponsored rows, every page is an index
-- range scan of at most 1000 entries regardless of depth, like the
-- primary-key pages the other scans use.
--
-- ~20,500 of ~244,000 rows are sponsored, so the index is small. The SQL
-- editor runs in a transaction, so no CONCURRENTLY; the table is read-mostly
-- and the build takes seconds.

create index if not exists idx_creator_posts_sponsored_id
  on creator_posts (id)
  where is_sponsored = true;

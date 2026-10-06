-- 0028_reset_hidden_creator_aliases.sql
--
-- STATUS: NOT YET APPLIED.
--
-- Returns the brand_aliases rows that the prepass labelled 'creator' for
-- accounts 0027 has since hidden (creators.status = 'non_creator') to the
-- unclassified state, so the AI alias classifier labels them properly.
--
-- ── Why ────────────────────────────────────────────────────────────────────
--
-- lib/pipeline/prepass.ts used to label any alias equal to a
-- social_profiles.handle as 'creator', with the account's display name as
-- canonical_name. For the brand, media and venue accounts among the
-- "creators" that label is wrong, and it is not harmless: a 'creator' alias
-- maps to no brand, so the sponsored posts in which active creators tag
-- @lorealparisusa (17 creators), @dmcasting (27), @tangleteezer (7) and the
-- rest count toward no brand card. Since 0027 the prepass only treats an
-- ACTIVE creator's handle as a creator, so these aliases would be classified
-- properly if they were unclassified — but the prepass and the classifier
-- only ever look at classified_at IS NULL rows, so the old labels stay
-- unless this file resets them.
--
-- ── What it touches (measured 2026-10-06 against the 993 hidden accounts) ──
--
-- 407 of the 993 hidden handles have a brand_aliases row: 366 'creator',
-- 38 'unknown', 1 'media', 2 verified 'brand'. Of the 366 'creator' rows,
-- 359 were written by the prepass (canonical_name set, classification_notes
-- null; canonical_name is the account's display name in all 359) and 7 by
-- the AI classifier (classification_notes set). Only the 359 are reset. The
-- 7 AI-labelled rows and the 38 'unknown' are left for a human in
-- /admin/brand-index: the classifier has already seen them. None of the 359
-- carries a category, region, score, preview or verified flag, so the reset
-- loses only the display-name canonical and the classified_at stamp.
--
-- ── The guard ──────────────────────────────────────────────────────────────
--
-- A row is reset only when ALL of:
--   * entity_type = 'creator', classification_notes IS NULL and
--     canonical_name IS NOT NULL — the shape the prepass writes;
--   * its alias is the handle of a creator with status 'non_creator';
--   * its alias is NOT the handle of any active creator, on either platform.
--     73 handles exist on both platforms under different creators; for those
--     the 'creator' label is right and the prepass would only write it back.
--     0 of the 359 on 2026-10-06.
-- After the update the rows are entity_type 'unknown', so a rerun matches
-- nothing: safe to rerun.
--
-- ── Why creators_count goes to 0 ───────────────────────────────────────────
--
-- The seed (lib/pipeline/seed.ts) only writes creators_count for aliases it
-- finds in active creators' sponsored posts, and never lowers the count of
-- an alias it no longer finds (6,422 such rows on 2026-10-06). 252 of the 359
-- are tagged by no active creator — only by their own account — and would
-- keep their old count of 1+, so the --min-count 1 classify run would pay to
-- classify accounts nobody tags. Zeroed here, the next seed restores the
-- real count for the 107 that active creators do tag (47 with 2+ creators,
-- 60 with 1) and leaves the other 252 at 0, where no classify run picks them
-- up.
--
-- ── After applying ─────────────────────────────────────────────────────────
--
--   npm run brand-aliases:seed
--   npm run brand-aliases:prepass
--   npm run brand-aliases:classify -- --min-count 2
--   npm run brand-aliases:classify -- --min-count 1
--
-- then verify the new brand rows in /admin/brand-index and run
-- npm run refresh:brand-brackets. See CLAUDE.md, "Phase 2".
--
-- Two statements: the count (expect 359), then the update (expect 359 rows).
-- No migration runner exists in this repo — apply manually via the Supabase
-- SQL editor, one statement at a time, same as 0001-0027.

select count(*) as rows_to_reset
  from brand_aliases ba
 where ba.entity_type = 'creator'
   and ba.classification_notes is null
   and ba.canonical_name is not null
   and exists (
         select 1
           from social_profiles sp
           join creators c on c.id = sp.creator_id
          where lower(btrim(sp.handle)) = ba.alias
            and c.status = 'non_creator')
   and not exists (
         select 1
           from social_profiles sp
           join creators c on c.id = sp.creator_id
          where lower(btrim(sp.handle)) = ba.alias
            and c.status = 'active');

update brand_aliases ba
   set entity_type    = 'unknown',
       canonical_name = null,
       classified_at  = null,
       creators_count = 0
 where ba.entity_type = 'creator'
   and ba.classification_notes is null
   and ba.canonical_name is not null
   and exists (
         select 1
           from social_profiles sp
           join creators c on c.id = sp.creator_id
          where lower(btrim(sp.handle)) = ba.alias
            and c.status = 'non_creator')
   and not exists (
         select 1
           from social_profiles sp
           join creators c on c.id = sp.creator_id
          where lower(btrim(sp.handle)) = ba.alias
            and c.status = 'active');

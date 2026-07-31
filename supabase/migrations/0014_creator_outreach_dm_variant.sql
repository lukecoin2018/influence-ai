-- STATUS: NOT YET APPLIED as of 2026-07-31.
--
-- Records WHICH generated DM was sent to a creator, so the A/B in the admin
-- Creator Targeting panel (app/admin/targeting) can be read back later.
--
-- Extends creator_outreach (0008_creator_outreach.sql) in place. The table
-- stays a SINGLE ROW PER CREATOR, upserted on the creator_id primary key —
-- deliberately NOT converted to append-only. creator_brand_outreach (0012) is
-- the append-only one, and it is append-only because a creator's follow-up
-- sequence to a brand needs history. This table answers "did the founder DM
-- this person, and with which message", which has one answer.
--
-- Both columns are NULLABLE and neither has a default. They are written once,
-- at the moment a creator is marked DMed, and never refreshed:
--
--   variant           'A' or 'B', from variantForCreator() in
--                     lib/admin/dm-messages.ts — a deterministic hash of
--                     creators.id, so the value is reproducible and survives
--                     the panel re-ranking or re-filtering its results.
--
--   sent_match_count  the brand-match count that was IN the message. Not the
--                     live count: totalMatchCount moves every time
--                     brand_brackets is rebuilt, so reading an A/B against a
--                     count that has since changed would not be a measurement.
--
-- NULL is expected and meaningful on both. A creator marked DMed by hand who
-- was never eligible for a generated message (TikTok, or zero matches) is
-- recorded with status 'dmed' and NULL variant, which is what keeps them out
-- of the experiment. Rows written before this migration are NULL for the same
-- reason. Code reading these columns must tolerate absent or NULL —
-- app/api/admin/targeting/route.ts selects '*' precisely so that it keeps
-- working either side of this file being applied.
--
-- No CHECK constraint on variant: a bare ADD CONSTRAINT is not rerunnable, and
-- this file must be safe to paste twice. The write path validates 'A' | 'B'
-- before the upsert (app/api/admin/targeting/outreach/route.ts).
--
-- No migration runner exists in this repo — apply these statements by hand in
-- the Supabase SQL editor, one at a time, same as 0001-0013. Idempotent: safe
-- to rerun (IF NOT EXISTS throughout).

alter table creator_outreach add column if not exists variant text;

alter table creator_outreach add column if not exists sent_match_count integer;

comment on column creator_outreach.variant is
  'Which generated DM variant was sent: A (headline + link) or B (headline + follower line + link). Assigned deterministically from creators.id by lib/admin/dm-messages.ts. NULL means no generated message was used for this creator — either they predate the generator, or they were marked DMed by hand while ineligible (TikTok, or zero brand matches), which keeps them out of the A/B.';

comment on column creator_outreach.sent_match_count is
  'The brand-match count that appeared in the DM at send time. Written once and never refreshed — the live count moves as brand_brackets is rebuilt, so this is the only figure the A/B can honestly be read against. NULL wherever variant is NULL.';

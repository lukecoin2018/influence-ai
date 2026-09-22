-- 0018_creator_profiles_nudge_sent_at.sql
--
-- STATUS: APPLIED 2026-09-15, by hand in the Supabase SQL editor.
--
-- One column: when the expired-verification-code nudge email was claimed for
-- this profile. The cron route (app/api/cron/verification-nudge/route.ts)
-- sets it BEFORE sending, with `WHERE nudge_sent_at IS NULL`, so a crash
-- mid-run or two overlapping runs cannot send twice. On a send failure it is
-- left set: a missed nudge is acceptable, a duplicate is not.
--
-- NULL means "never nudged" and is the eligibility condition. Rows that
-- predate this column are NULL by default, and the route additionally
-- requires created_at within the last 14 days, so no old row is backfilled
-- with a nudge.
--
-- Deliberately NOT added to 0015's protected-column list. The trigger there
-- exempts service_role (the only writer), and a creator clearing their own
-- nudge_sent_at from the browser would only make them eligible for one more
-- email about their own claim. So the guarantee is "one nudge per profile
-- unless the creator clears the column".
--
-- No migration runner exists in this repo — apply manually via the Supabase
-- SQL editor, same as 0001-0017. Idempotent: safe to rerun.

alter table creator_profiles
  add column if not exists nudge_sent_at timestamptz;

comment on column creator_profiles.nudge_sent_at is
  'When the one-time expired-code nudge email was claimed for this profile by /api/cron/verification-nudge. Set before the send, never cleared by the app; NULL = never nudged and is the eligibility condition. Not in 0015''s protected list: service_role is the only writer and a creator clearing it only re-enables one email to themselves.';

-- 0010_creator_profiles_attempt_window.sql
-- Records when the last *failed* bio-verification attempt happened, so the
-- attempt counter can expire instead of locking a creator out forever.
--
-- Why: verification_attempts had a hard ceiling of 5 and nothing anywhere
-- reset it — not the verify route on success, not the regenerate route, no
-- admin tool. A creator who hit it was permanently stuck behind "Too many
-- failed attempts. Please contact support.", pointing at a support channel the
-- UI does not offer. A time-based reset needs to know when the last attempt
-- was, and nothing existing records that: verification_code_expires_at moves
-- only on mint, claimed_at only on success, and updated_at (written by hand in
-- the profile edit form) moves on every unrelated write — token spends, Stripe
-- webhooks, code re-issues — so it cannot isolate an attempt.
--
-- NULL = no attempt recorded. Read as "not locked out", which also makes every
-- pre-migration row safe and lets the route run before this file is applied.
-- Deliberately unconstrained: no CHECK, no NOT NULL, no default. The verify
-- path must never fail on the shape of this column.
--
-- No migration runner exists in this repo — apply manually via the Supabase
-- SQL editor, same as 0001-0009. Already applied 2026-07-28.
-- Idempotent: safe to rerun.

ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS last_verification_attempt_at timestamptz;

COMMENT ON COLUMN creator_profiles.last_verification_attempt_at IS
  'When the last failed bio-verification attempt was recorded. Attempts older than the cooling-off window are ignored; NULL = none recorded, treated as not locked out.';

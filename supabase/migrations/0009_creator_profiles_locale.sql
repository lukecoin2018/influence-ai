-- 0009_creator_profiles_locale.sql
-- Persists the UI locale a creator was shown at claim time.
--
-- Why: /es/claim/[handle] serves a Spanish teaser, but locale was
-- dropped at the first click. Storing it lets the verify page and
-- future transactional emails use the language the creator actually
-- saw, rather than re-deriving from social_profiles.detected_country,
-- which can change on a re-scrape.
--
-- NULL = unknown (pre-migration rows), read as 'en' in app code.
-- Deliberately unconstrained: no CHECK, no NOT NULL, no default. A bad
-- locale value must never fail the INSERT in the claim path.
--
-- No migration runner exists in this repo — apply manually via the
-- Supabase SQL editor, same as 0001-0008. Already applied 2026-07-26.
-- Idempotent: safe to rerun.

ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS locale text;

COMMENT ON COLUMN creator_profiles.locale IS
  'UI locale shown at claim time: en, es, or NULL (unknown, read as en).';

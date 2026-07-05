-- Adds per-report competitor selection for the brand-reports-v2 three-tier report.
--
-- null (the default, and the value on every pre-existing report) means "no
-- explicit choice has been saved yet" — the report page and admin generator
-- fall back to auto-suggesting competitors live (same category, verified
-- brand aliases, >=5 distinct creators, ordered by creator count). A saved
-- array — including an empty one, meaning the admin explicitly removed every
-- suggestion — always wins over the live auto-suggestion.
--
-- No migration runner exists in this repo (no supabase/ CLI project, no
-- pg/postgres client, no DATABASE_URL) — apply this file manually via the
-- Supabase SQL editor, same as 0001_brand_aliases.sql. Idempotent: safe to
-- rerun (IF NOT EXISTS throughout).

alter table brand_reports
  add column if not exists competitor_names text[];

comment on column brand_reports.competitor_names is
  'Canonical brand_aliases.canonical_name values chosen as Tier 2 competitors for this report. Null = not yet customized, auto-suggest live; array (incl. empty) = explicit admin choice.';

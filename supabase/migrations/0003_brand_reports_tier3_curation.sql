-- Adds per-report Tier 3 curation to brand_reports, mirroring the
-- competitor_names override pattern from 0002_brand_reports_competitors.sql:
-- null/empty means "no manual curation", the report page computes Tier 3
-- live as usual; a saved array is layered on top of that live computation.
--
-- No migration runner exists in this repo — apply this file manually via the
-- Supabase SQL editor, same as 0001/0002. Idempotent: safe to rerun
-- (IF NOT EXISTS throughout).

alter table brand_reports
  add column if not exists excluded_creator_ids uuid[],
  add column if not exists pinned_creator_ids uuid[];

comment on column brand_reports.excluded_creator_ids is
  'Tier 3 creators.id values manually removed by an admin from this report''s recommended matches — the next-ranked eligible match fills the slot. Null/empty = no manual removals.';
comment on column brand_reports.pinned_creator_ids is
  'Tier 3 creators.id values manually pinned by an admin to always appear first in this report''s recommended matches. A pinned creator who also overlaps a Tier 2 competitor still gets excluded — Tier 2 exclusion always wins. Null/empty = no manual pins.';

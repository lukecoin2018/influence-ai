-- Scoring + review columns for the single-creator classification sweep.
-- Scores are internal discovery signal only; they do NOT gate anything
-- visitor-facing and are independent of the human-only `verified` flag.
--
-- Also widens the entity_type check constraint to allow 'venue' (real
-- places/events that run creator marketing but aren't a product brand —
-- hotels, racecourses, festivals). The constraint was defined in
-- 0001_brand_aliases.sql without 'venue'; the singleton classify prompt
-- (scripts/brand-aliases/classify.mjs) now emits it, so without this the
-- classifier's upsert would fail on every venue-typed row.

alter table public.brand_aliases
  add column if not exists recognizability     smallint,
  add column if not exists im_intensity        smallint,
  add column if not exists classification_notes text,
  add column if not exists classification_preview jsonb;

alter table public.brand_aliases
  drop constraint if exists brand_aliases_entity_type_check;

alter table public.brand_aliases
  add constraint brand_aliases_entity_type_check
    check (entity_type in ('brand', 'creator', 'celebrity', 'media', 'venue', 'fragment', 'unknown'));

alter table public.brand_aliases
  add constraint brand_aliases_recognizability_range
    check (recognizability is null or recognizability between 1 and 5),
  add constraint brand_aliases_im_intensity_range
    check (im_intensity is null or im_intensity between 1 and 5);

comment on column public.brand_aliases.recognizability is
  'Brand/venue real-world recognizability, 1-5. Null for non-brand/venue types. Internal scraping-target signal only.';
comment on column public.brand_aliases.im_intensity is
  'Brand/venue influencer-marketing intensity, 1-5. Null for non-brand/venue types. Internal scraping-target signal only.';
comment on column public.brand_aliases.classification_notes is
  'One-line model rationale for the classification/score. Review aid.';
comment on column public.brand_aliases.classification_preview is
  'Scratch column: full model verdict JSON during test-batch runs, before committing to live columns. Dropped in a later cleanup migration.';

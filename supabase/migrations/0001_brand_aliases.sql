-- Brand normalization pipeline.
--
-- Does NOT touch the existing `brand_profiles` table or the admin Brands
-- section (app/admin/brands) — those manage brand *customer accounts*, an
-- unrelated concept. This is a separate system for normalizing the free-text
-- brand names detected in creator_posts.detected_brands into canonical
-- entities (brand / creator / celebrity / media / fragment / unknown).
--
-- No migration runner exists in this repo (no supabase/ CLI project, no
-- pg/postgres client, no DATABASE_URL) — apply this file manually via the
-- Supabase SQL editor. Idempotent: safe to rerun (IF NOT EXISTS / OR REPLACE
-- throughout).

create table if not exists brand_aliases (
  alias           text primary key,
  canonical_name  text,
  entity_type     text not null default 'unknown'
                    check (entity_type in ('brand', 'creator', 'celebrity', 'media', 'fragment', 'unknown')),
  category        text,
  region          text,
  verified        boolean not null default false,
  creators_count  int not null default 0,
  classified_at   timestamptz
);

create index if not exists idx_brand_aliases_entity_type on brand_aliases (entity_type);
create index if not exists idx_brand_aliases_creators_count on brand_aliases (creators_count desc);
create index if not exists idx_brand_aliases_unclassified on brand_aliases (creators_count desc) where classified_at is null;

comment on table brand_aliases is
  'Normalizes creator_posts.detected_brands free-text strings into canonical entities. Unrelated to brand_profiles (brand customer accounts).';
comment on column brand_aliases.alias is 'Raw detected string as it appears in creator_posts.detected_brands (lowercase handle-like token).';
comment on column brand_aliases.canonical_name is 'Human-readable canonical brand/entity name, e.g. "Shein" for all regional Shein accounts.';
comment on column brand_aliases.region is 'Preserved when a canonical entity has region-specific accounts (e.g. Shein US vs Shein UK) merged under one canonical_name.';
comment on column brand_aliases.creators_count is 'Distinct creators who have posted with this alias detected — maintained by scripts/brand-aliases/seed.mjs, used as the AI-classification eligibility threshold (>=2).';

-- Brand partnership rollup: only entity_type = 'brand' aliases, joined back
-- through creator_posts.detected_brands. jsonb_array_elements_text(to_jsonb(...))
-- works whether detected_brands is a native text[] or a jsonb array column.
create or replace view v_brand_partnerships as
select
  ba.canonical_name,
  ba.category,
  count(distinct sp.creator_id) as distinct_creators,
  count(*) as sponsored_posts,
  max(cp.posted_at) as most_recent_post
from creator_posts cp
join social_profiles sp on sp.id = cp.social_profile_id
cross join lateral jsonb_array_elements_text(to_jsonb(cp.detected_brands)) as detected(alias)
join brand_aliases ba on ba.alias = detected.alias
where ba.entity_type = 'brand'
group by ba.canonical_name, ba.category;

comment on view v_brand_partnerships is
  'Brand-only (entity_type=brand) partnership rollup: distinct creators, sponsored post count, and most recent post per canonical brand.';

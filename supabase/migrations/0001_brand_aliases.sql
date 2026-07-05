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

-- brand_aliases is internal sales intelligence and must NOT be readable with
-- just the public anon key (unlike brand_profiles/creators, which several
-- other admin pages read/write via the anon-key browser client relying only
-- on app-layer role gating — a pre-existing gap worth a security review
-- later, but not fixed here). RLS is enabled and scoped to admins via
-- user_roles, so the Brand Index page's existing anon-key browser client
-- keeps working when a real admin is logged in (their session JWT makes
-- auth.uid() resolve correctly even though the client was constructed with
-- the anon key) — genuinely anonymous/non-admin requests get zero rows.
alter table brand_aliases enable row level security;

create or replace function is_admin_user() returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
  );
$$;

drop policy if exists "Admins can view brand_aliases" on brand_aliases;
create policy "Admins can view brand_aliases"
  on brand_aliases for select
  to authenticated
  using (is_admin_user());

drop policy if exists "Admins can update brand_aliases" on brand_aliases;
create policy "Admins can update brand_aliases"
  on brand_aliases for update
  to authenticated
  using (is_admin_user())
  with check (is_admin_user());

comment on table brand_aliases is
  'Normalizes creator_posts.detected_brands free-text strings into canonical entities. Unrelated to brand_profiles (brand customer accounts).';
comment on column brand_aliases.alias is 'Raw detected string as it appears in creator_posts.detected_brands (lowercase handle-like token).';
comment on column brand_aliases.canonical_name is 'Human-readable canonical brand/entity name, e.g. "Shein" for all regional Shein accounts.';
comment on column brand_aliases.region is 'Preserved when a canonical entity has region-specific accounts (e.g. Shein US vs Shein UK) merged under one canonical_name.';
comment on column brand_aliases.creators_count is 'Distinct creators who have posted with this alias detected — maintained by scripts/brand-aliases/seed.mjs, used as the AI-classification eligibility threshold (>=2).';

-- Brand partnership rollup: only entity_type = 'brand' aliases, joined back
-- through creator_posts.detected_brands. jsonb_array_elements_text(to_jsonb(...))
-- works whether detected_brands is a native text[] or a jsonb array column.
--
-- security_invoker=true is required here: by default a Postgres view runs
-- with the VIEW OWNER's privileges for RLS purposes, which would silently
-- bypass the admin-only policy just added to brand_aliases and leak this
-- data through the view to any authenticated (non-admin) caller. This makes
-- it respect the querying user's own permissions instead, same as if they'd
-- queried brand_aliases directly.
--
-- count(distinct cp.id): a post can carry multiple detected_brands entries
-- that resolve to the same canonical brand (e.g. "shein" + "sheinofficial"
-- both mentioned in one caption) — count(*) would double-count that post.
-- cp.is_sponsored filter: only posts actually flagged as a brand
-- partnership count, not every post that happens to mention a brand name.
-- lower(detected.alias): creator_posts.detected_brands isn't guaranteed
-- lowercase at the source; brand_aliases.alias always is (seed.mjs
-- normalizes it), so the join needs a case-insensitive match.
create or replace view v_brand_partnerships
  with (security_invoker = true)
as
select
  ba.canonical_name,
  ba.category,
  count(distinct sp.creator_id) as distinct_creators,
  count(distinct cp.id) as sponsored_posts,
  max(cp.posted_at) as most_recent_post
from creator_posts cp
join social_profiles sp on sp.id = cp.social_profile_id
cross join lateral jsonb_array_elements_text(to_jsonb(cp.detected_brands)) as detected(alias)
join brand_aliases ba on ba.alias = lower(detected.alias)
where ba.entity_type = 'brand'
  and cp.is_sponsored
group by ba.canonical_name, ba.category;

comment on view v_brand_partnerships is
  'Brand-only (entity_type=brand) partnership rollup: distinct creators, sponsored post count, and most recent post per canonical brand.';

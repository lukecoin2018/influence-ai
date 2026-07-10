-- Cache table for the creator-side brand-intelligence feature's matching spine.
--
-- One row per verified canonical brand x platform: the hiring follower-bracket
-- (p25/p75), distinct-creator count, sponsored-post count, recency, and
-- repeat-ratio. This is NOT an all-creator precompute — per-creator matching
-- against these brackets happens on-demand at view time in a later PR (the
-- read layer). This table only caches the ~332-verified-canonical-brand side,
-- which is small and slow-changing, refreshed manually via
-- `npm run refresh:brand-brackets` (no pg_cron — see scripts/brand-brackets/refresh.ts).
--
-- No migration runner exists in this repo — apply this file manually via the
-- Supabase SQL editor, same as 0001-0006. Idempotent: safe to rerun
-- (IF NOT EXISTS / OR REPLACE throughout).

create table if not exists brand_brackets (
  canonical_name    text not null,
  platform          text not null check (platform in ('instagram', 'tiktok')),
  category          text,
  p25_followers     numeric not null,
  p75_followers     numeric not null,
  distinct_creators int not null,
  sponsored_posts   int not null,
  most_recent_post  timestamptz,
  repeat_ratio      numeric not null,
  regions           text[] not null default '{}',
  refreshed_at      timestamptz not null default now(),
  primary key (canonical_name, platform)
);

-- Supports the later read layer's "which brands' bracket overlaps this creator's
-- follower_count on this platform" lookup (platform + range scan on the bracket
-- columns). At ~332 brands x 2 platforms this index barely matters for
-- performance today, but the read layer will filter on exactly this shape.
create index if not exists idx_brand_brackets_platform_bracket
  on brand_brackets (platform, p25_followers, p75_followers);

-- Same lockdown philosophy as brand_aliases (0001_brand_aliases.sql): this
-- table holds verified-brand aggregate data derived from brand_aliases, and
-- must not be readable by the anon/browser client. RLS is enabled with
-- deliberately NO policies — with RLS on and no policies, PostgREST denies all
-- access to anon/authenticated callers by default, and only a role that
-- bypasses RLS (service_role, which lib/supabase-admin.ts's
-- createSupabaseAdminClient() authenticates as) can read or write it. The
-- refresh script (scripts/brand-brackets/refresh.ts) uses its own service-role
-- client for the same reason lib/supabase-admin.ts can't be imported from a
-- standalone script — see that script's header comment. The (later) read
-- layer must read this table server-side via the service-role client, never
-- expose it to the browser/anon client.
alter table brand_brackets enable row level security;

comment on table brand_brackets is
  'Cached hiring follower-bracket (p25/p75) per verified canonical brand x platform. Refreshed manually via `npm run refresh:brand-brackets` — no cron, no per-creator precompute. Per-creator matching against these brackets happens on-demand at view time in the read layer. RLS enabled with no policies: only the service-role client (bypasses RLS) can read/write.';
comment on column brand_brackets.canonical_name is
  'brand_aliases.canonical_name for a verified, entity_type=brand canonical brand — see lib/reports/canonical-brands.ts aggregateCanonicalBrands().';
comment on column brand_brackets.platform is
  'instagram or tiktok. Brackets are computed per-platform since matching requires platform alignment.';
comment on column brand_brackets.category is
  'Mode category across the canonical''s aliases, ties broken alphabetically — see aggregateCanonicalBrands(). Null if no alias in the group has a category.';
comment on column brand_brackets.p25_followers is
  '25th percentile (percentile_cont linear interpolation, computed in TypeScript — see scripts/brand-brackets/refresh.ts header comment for why) of social_profiles.follower_count among this brand''s distinct sponsored-post creators on this platform.';
comment on column brand_brackets.p75_followers is
  '75th percentile, same population as p25_followers.';
comment on column brand_brackets.distinct_creators is
  'Distinct creator_id count with sponsored-post activity for this canonical brand on this platform.';
comment on column brand_brackets.sponsored_posts is
  'Distinct sponsored creator_posts.id count for this canonical brand on this platform — a post naming two aliases of the same canonical is counted once.';
comment on column brand_brackets.most_recent_post is
  'max(creator_posts.posted_at) for this canonical brand on this platform.';
comment on column brand_brackets.repeat_ratio is
  'sponsored_posts / distinct_creators for this platform. High = ongoing ambassador-style repeat hiring, not one-off.';
comment on column brand_brackets.regions is
  'Distinct brand_aliases.region values across this canonical''s aliases (all platforms/entity rows) — additive enrichment data for a later region-tag feature (see spec), unused by the MVP matching spine.';
comment on column brand_brackets.refreshed_at is
  'When this row was last (re)computed by npm run refresh:brand-brackets.';

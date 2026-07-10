// Computes brand_brackets: one row per verified canonical brand x platform,
// caching the hiring follower-bracket (p25/p75), distinct-creator count,
// sponsored-post count, recency, repeat-ratio, and region set. Manual refresh
// (no cron) — run: npm run refresh:brand-brackets [-- --brand="Shein"] [--dry-run]
//
// Deliberately does the percentile math in TypeScript (lib/reports/percentile.ts),
// not via a `percentile_cont` SQL function, even though that's the more obvious
// place for a percentile aggregate to live. Reasoning: this script has to run
// against LIVE data for the single-brand checkpoint before the brand_brackets
// migration is applied (this repo's migrations are shown, then applied manually
// by a human in the Supabase SQL editor — there's no way for this script to run
// first). Adding a new SQL function would mean the checkpoint itself is blocked
// on a migration apply, defeating the point of checking real numbers before
// committing to anything. percentileCont() in lib/reports/percentile.ts
// implements Postgres's exact percentile_cont linear-interpolation formula, so
// this isn't an approximation of the SQL aggregate — it's the same algorithm.
//
// Reuses lib/reports/canonical-brands.ts's aggregateCanonicalBrands() (2a) for
// canonical grouping, verified/entity_type filtering, region-set aggregation,
// and mode-category selection — none of that logic is reimplemented here.
import { supabase, paginate } from './_supabase';
import { aggregateCanonicalBrands, buildAliasToCanonicalMap, type BrandAliasRow } from '../../lib/reports/canonical-brands';
import { percentileCont } from '../../lib/reports/percentile';

const PAGE_SIZE = 1000;

type Platform = 'instagram' | 'tiktok';

type RawBrandAliasRow = {
  alias: string;
  canonical_name: string | null;
  entity_type: string;
  category: string | null;
  region: string | null;
  verified: boolean;
};

type RawSocialProfileRow = {
  id: string;
  creator_id: string;
  platform: Platform;
  follower_count: number | null;
};

type RawSponsoredPostRow = {
  id: string;
  social_profile_id: string;
  detected_brands: string[] | null;
  posted_at: string | null;
};

function normalizeAlias(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchBrandAliases(): Promise<BrandAliasRow[]> {
  const rows: BrandAliasRow[] = [];
  await paginate<RawBrandAliasRow>(
    () => supabase.from('brand_aliases').select('alias, canonical_name, entity_type, category, region, verified'),
    PAGE_SIZE,
    (page) => {
      for (const r of page) {
        rows.push({
          alias: r.alias,
          canonicalName: r.canonical_name,
          entityType: r.entity_type,
          category: r.category,
          region: r.region,
          verified: r.verified,
        });
      }
    },
  );
  return rows;
}

type SocialProfile = { creatorId: string; platform: Platform; followerCount: number | null };

async function fetchSocialProfilesById(): Promise<Map<string, SocialProfile>> {
  const byId = new Map<string, SocialProfile>();
  await paginate<RawSocialProfileRow>(
    () => supabase.from('social_profiles').select('id, creator_id, platform, follower_count'),
    PAGE_SIZE,
    (page) => {
      for (const r of page) byId.set(r.id, { creatorId: r.creator_id, platform: r.platform, followerCount: r.follower_count });
    },
  );
  return byId;
}

type SponsoredPost = { id: string; socialProfileId: string; detectedBrands: string[]; postedAt: string | null };

async function fetchSponsoredPosts(): Promise<SponsoredPost[]> {
  const rows: SponsoredPost[] = [];
  await paginate<RawSponsoredPostRow>(
    () => supabase.from('creator_posts').select('id, social_profile_id, detected_brands, posted_at').eq('is_sponsored', true),
    PAGE_SIZE,
    (page) => {
      for (const r of page) {
        rows.push({
          id: r.id,
          socialProfileId: r.social_profile_id,
          detectedBrands: Array.isArray(r.detected_brands) ? r.detected_brands : [],
          postedAt: r.posted_at,
        });
      }
    },
  );
  return rows;
}

type BracketAccumulator = {
  // creatorId -> followerCount, first alias a creator is seen under wins (mirrors 2a's tiebreak).
  creatorFollowers: Map<string, number>;
  postIds: Set<string>;
  mostRecentPost: string | null;
};

export type BracketRow = {
  canonical_name: string;
  platform: Platform;
  category: string | null;
  p25_followers: number;
  p75_followers: number;
  distinct_creators: number;
  sponsored_posts: number;
  most_recent_post: string | null;
  repeat_ratio: number;
  regions: string[];
  refreshed_at: string;
};

function accumulatorKey(canonicalName: string, platform: Platform): string {
  return `${canonicalName} ${platform}`;
}

async function computeBrackets(): Promise<BracketRow[]> {
  const [aliasRows, profilesById, posts] = await Promise.all([
    fetchBrandAliases(),
    fetchSocialProfilesById(),
    fetchSponsoredPosts(),
  ]);

  const aliasToCanonical = buildAliasToCanonicalMap(aliasRows);

  const byKey = new Map<string, { canonicalName: string; platform: Platform; acc: BracketAccumulator }>();
  // Alias/creator hits, fed to the 2a helper purely for its category-mode + region-set aggregation.
  const reachForCategoryAndRegions: { alias: string; creatorId: string }[] = [];

  for (const post of posts) {
    const profile = profilesById.get(post.socialProfileId);
    if (!profile || profile.followerCount == null) continue; // no scorable follower count — excluded, never a fallback

    const canonicalsHitInThisPost = new Set<string>(); // a post naming two aliases of the same canonical counts once
    for (const raw of post.detectedBrands) {
      const alias = normalizeAlias(raw);
      if (!alias) continue;
      const canonicalName = aliasToCanonical.get(alias);
      if (!canonicalName) continue; // unverified / non-brand / unclassified alias — excluded

      reachForCategoryAndRegions.push({ alias, creatorId: profile.creatorId });

      const key = accumulatorKey(canonicalName, profile.platform);
      let entry = byKey.get(key);
      if (!entry) {
        entry = { canonicalName, platform: profile.platform, acc: { creatorFollowers: new Map(), postIds: new Set(), mostRecentPost: null } };
        byKey.set(key, entry);
      }
      const { acc } = entry;
      if (!acc.creatorFollowers.has(profile.creatorId)) acc.creatorFollowers.set(profile.creatorId, profile.followerCount);
      if (!canonicalsHitInThisPost.has(canonicalName)) {
        acc.postIds.add(post.id);
        canonicalsHitInThisPost.add(canonicalName);
      }
      if (post.postedAt && (!acc.mostRecentPost || post.postedAt > acc.mostRecentPost)) acc.mostRecentPost = post.postedAt;
    }
  }

  const canonicalBrands = aggregateCanonicalBrands(aliasRows, reachForCategoryAndRegions);
  const metaByCanonical = new Map(canonicalBrands.map((c) => [c.canonicalName, c]));

  const refreshedAt = new Date().toISOString();
  const rows: BracketRow[] = [];
  for (const { canonicalName, platform, acc } of byKey.values()) {
    const followerCounts = [...acc.creatorFollowers.values()].sort((a, b) => a - b);
    const p25 = percentileCont(followerCounts, 0.25);
    const p75 = percentileCont(followerCounts, 0.75);
    if (p25 == null || p75 == null) continue; // guards a zero-creator group; shouldn't occur since an accumulator only exists once a creator is recorded

    const distinctCreators = acc.creatorFollowers.size;
    const sponsoredPosts = acc.postIds.size;
    const meta = metaByCanonical.get(canonicalName);

    rows.push({
      canonical_name: canonicalName,
      platform,
      category: meta?.category ?? null,
      p25_followers: p25,
      p75_followers: p75,
      distinct_creators: distinctCreators,
      sponsored_posts: sponsoredPosts,
      most_recent_post: acc.mostRecentPost,
      repeat_ratio: sponsoredPosts / distinctCreators,
      regions: meta?.regions ?? [],
      refreshed_at: refreshedAt,
    });
  }

  return rows.sort((a, b) => a.canonical_name.localeCompare(b.canonical_name) || a.platform.localeCompare(b.platform));
}

function printRows(rows: BracketRow[]): void {
  for (const row of rows) {
    console.log(`${row.canonical_name} [${row.platform}]`);
    console.log(`  category: ${row.category ?? '(none)'}`);
    console.log(`  bracket (p25-p75 followers): ${Math.round(row.p25_followers).toLocaleString()} - ${Math.round(row.p75_followers).toLocaleString()}`);
    console.log(`  distinct_creators: ${row.distinct_creators}`);
    console.log(`  sponsored_posts: ${row.sponsored_posts}`);
    console.log(`  repeat_ratio: ${row.repeat_ratio.toFixed(2)}`);
    console.log(`  most_recent_post: ${row.most_recent_post ?? '(none)'}`);
    console.log(`  regions: ${row.regions.length > 0 ? row.regions.join(', ') : '(none)'}`);
    console.log('');
  }
}

/** Removes brand_brackets rows for (canonical_name, platform) pairs absent from this recompute — e.g. a brand that lost verification or ran out of qualifying activity. Keeps the table a true "full recompute" rather than an append-only cache. */
async function deleteStaleRows(currentRows: BracketRow[]): Promise<void> {
  const currentKeys = new Set(currentRows.map((r) => accumulatorKey(r.canonical_name, r.platform)));
  const { data: existing, error } = await supabase.from('brand_brackets').select('canonical_name, platform');
  if (error) throw new Error(`Failed reading existing brand_brackets rows: ${error.message}`);

  const stale = ((existing ?? []) as { canonical_name: string; platform: Platform }[]).filter(
    (row) => !currentKeys.has(accumulatorKey(row.canonical_name, row.platform)),
  );
  for (const row of stale) {
    const { error: deleteError } = await supabase
      .from('brand_brackets')
      .delete()
      .eq('canonical_name', row.canonical_name)
      .eq('platform', row.platform);
    if (deleteError) throw new Error(`Failed deleting stale row ${row.canonical_name}/${row.platform}: ${deleteError.message}`);
  }
  if (stale.length > 0) console.log(`Removed ${stale.length} stale row(s) no longer produced by this recompute.`);
}

function parseArgs(argv: string[]): { brand: string | null; dryRun: boolean } {
  let brand: string | null = null;
  let dryRun = false;
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--brand=')) brand = arg.slice('--brand='.length);
  }
  // A --brand filter is always a preview: never write a partial recompute to the table.
  return { brand, dryRun: dryRun || brand !== null };
}

async function main(): Promise<void> {
  const { brand, dryRun } = parseArgs(process.argv.slice(2));

  console.log('Computing brand brackets from live creator_posts / social_profiles / brand_aliases...\n');
  const allRows = await computeBrackets();
  const rows = brand ? allRows.filter((r) => r.canonical_name === brand) : allRows;

  if (brand && rows.length === 0) {
    console.log(`No sponsored, verified-brand, follower-scored activity found for canonical_name="${brand}". Nothing to show.`);
    return;
  }

  printRows(rows);

  if (dryRun) {
    console.log(`Dry run — ${rows.length} row(s) computed, nothing written to brand_brackets.`);
    return;
  }

  const { error: upsertError } = await supabase.from('brand_brackets').upsert(rows, { onConflict: 'canonical_name,platform' });
  if (upsertError) throw new Error(`Upsert failed: ${upsertError.message}`);
  await deleteStaleRows(rows);

  const mostRecentOverall = rows.reduce<string | null>(
    (max, r) => (r.most_recent_post && (!max || r.most_recent_post > max) ? r.most_recent_post : max),
    null,
  );
  const oldestBracketSource = rows.reduce<string | null>(
    (min, r) => (r.most_recent_post && (!min || r.most_recent_post < min) ? r.most_recent_post : min),
    null,
  );

  console.log(`Refreshed ${rows.length} brand x platform row(s).`);
  console.log(`Most recent post across all: ${mostRecentOverall ?? '(none)'}`);
  console.log(`Oldest bracket source (least-fresh brand's own most-recent post): ${oldestBracketSource ?? '(none)'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import type { PipelineClient, PipelineOptions } from './types';
import { noopProgress } from './types';
import { paginate } from './paginate';
import { normalizeAlias } from './aggregate';
import { aggregateCanonicalBrands, buildAliasToCanonicalMap, type BrandAliasRow } from '../reports/canonical-brands';
import { percentileCont } from '../reports/percentile';

/**
 * Step 4 — recomputes brand_brackets: one row per verified canonical brand x
 * platform, caching the hiring follower-bracket (p25/p75), distinct-creator
 * count, sponsored-post count, recency, repeat-ratio, and region set.
 *
 * Deliberately does the percentile math in TypeScript (lib/reports/percentile.ts),
 * not via a `percentile_cont` SQL function — percentileCont() implements
 * Postgres's exact percentile_cont linear-interpolation formula, so this is
 * the same algorithm, not an approximation. Reuses
 * lib/reports/canonical-brands.ts for canonical grouping, verified/entity_type
 * filtering, region-set aggregation, and mode-category selection.
 *
 * Logic moved unchanged from scripts/brand-brackets/refresh.ts. New here:
 * `netChange`, measured as the brand_brackets row count after minus before,
 * because the upsert cannot say which rows it inserted; and `onComputed`, a
 * hook that fires between the recompute and the write so the CLI can print
 * every row exactly where it used to.
 */
const PAGE_SIZE = 1000;

export type Platform = 'instagram' | 'tiktok';

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

export type RefreshOptions = PipelineOptions & {
  /** Restrict the printed/returned rows to one canonical_name. Always implies dryRun. */
  brand?: string | null;
  /** Compute and return rows without writing brand_brackets. */
  dryRun?: boolean;
  /** Called with the computed rows (after the brand filter) before anything is written. */
  onComputed?: (rows: BracketRow[]) => void;
};

export type RefreshResult = {
  /** Whether this run wrote nothing (explicit dryRun, or a brand filter). */
  dryRun: boolean;
  /** The brand filter, if any. */
  brand: string | null;
  /** Rows computed (after the brand filter). Returned so the CLI can print them. */
  rows: BracketRow[];
  rowsComputed: number;
  /** Rows upserted. 0 on a dry run. */
  rowsWritten: number;
  /** (canonical_name, platform) rows deleted because the recompute no longer produces them. 0 on a dry run. */
  staleDeleted: number;
  /** brand_brackets row count after the run minus before. 0 on a dry run. */
  netChange: number;
  /** Newest most_recent_post across the computed rows. */
  mostRecentPost: string | null;
  /** Oldest most_recent_post across the computed rows — the least-fresh brand's own newest post. */
  oldestBracketSource: string | null;
};

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

async function fetchBrandAliases(client: PipelineClient): Promise<BrandAliasRow[]> {
  const rows: BrandAliasRow[] = [];
  await paginate<RawBrandAliasRow>(
    () => client.from('brand_aliases').select('alias, canonical_name, entity_type, category, region, verified'),
    { key: 'alias', pageSize: PAGE_SIZE },
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

async function fetchSocialProfilesById(client: PipelineClient): Promise<Map<string, SocialProfile>> {
  const byId = new Map<string, SocialProfile>();
  await paginate<RawSocialProfileRow>(
    () => client.from('social_profiles').select('id, creator_id, platform, follower_count'),
    { key: 'id', pageSize: PAGE_SIZE },
    (page) => {
      for (const r of page) byId.set(r.id, { creatorId: r.creator_id, platform: r.platform, followerCount: r.follower_count });
    },
  );
  return byId;
}

type SponsoredPost = { id: string; socialProfileId: string; detectedBrands: string[]; postedAt: string | null };

async function fetchSponsoredPosts(client: PipelineClient): Promise<SponsoredPost[]> {
  const rows: SponsoredPost[] = [];
  await paginate<RawSponsoredPostRow>(
    () => client.from('creator_posts').select('id, social_profile_id, detected_brands, posted_at').eq('is_sponsored', true),
    { key: 'id', pageSize: PAGE_SIZE },
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

function accumulatorKey(canonicalName: string, platform: Platform): string {
  return `${canonicalName} ${platform}`;
}

export async function computeBrackets(client: PipelineClient): Promise<BracketRow[]> {
  const [aliasRows, profilesById, posts] = await Promise.all([
    fetchBrandAliases(client),
    fetchSocialProfilesById(client),
    fetchSponsoredPosts(client),
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

/** Removes brand_brackets rows for (canonical_name, platform) pairs absent from this recompute — e.g. a brand that lost verification or ran out of qualifying activity. Keeps the table a true "full recompute" rather than an append-only cache. Returns how many were removed. */
async function deleteStaleRows(client: PipelineClient, currentRows: BracketRow[]): Promise<number> {
  const currentKeys = new Set(currentRows.map((r) => accumulatorKey(r.canonical_name, r.platform)));
  const { data: existing, error } = await client.from('brand_brackets').select('canonical_name, platform');
  if (error) throw new Error(`Failed reading existing brand_brackets rows: ${error.message}`);

  const stale = ((existing ?? []) as { canonical_name: string; platform: Platform }[]).filter(
    (row) => !currentKeys.has(accumulatorKey(row.canonical_name, row.platform)),
  );
  for (const row of stale) {
    const { error: deleteError } = await client
      .from('brand_brackets')
      .delete()
      .eq('canonical_name', row.canonical_name)
      .eq('platform', row.platform);
    if (deleteError) throw new Error(`Failed deleting stale row ${row.canonical_name}/${row.platform}: ${deleteError.message}`);
  }
  return stale.length;
}

async function countBrackets(client: PipelineClient): Promise<number> {
  const { count, error } = await client.from('brand_brackets').select('*', { count: 'exact', head: true });
  if (error) throw new Error(`Counting brand_brackets failed: ${error.message}`);
  return count ?? 0;
}

function freshness(rows: BracketRow[]): { mostRecentPost: string | null; oldestBracketSource: string | null } {
  const mostRecentPost = rows.reduce<string | null>(
    (max, r) => (r.most_recent_post && (!max || r.most_recent_post > max) ? r.most_recent_post : max),
    null,
  );
  const oldestBracketSource = rows.reduce<string | null>(
    (min, r) => (r.most_recent_post && (!min || r.most_recent_post < min) ? r.most_recent_post : min),
    null,
  );
  return { mostRecentPost, oldestBracketSource };
}

export async function runRefresh(client: PipelineClient, options: RefreshOptions = {}): Promise<RefreshResult> {
  const onProgress = options.onProgress ?? noopProgress;
  const brand = options.brand ?? null;
  // A brand filter is always a preview: never write a partial recompute to the table.
  const dryRun = (options.dryRun ?? false) || brand !== null;

  onProgress('Computing brand brackets from live creator_posts / social_profiles / brand_aliases...\n');
  const allRows = await computeBrackets(client);
  const rows = brand ? allRows.filter((r) => r.canonical_name === brand) : allRows;

  options.onComputed?.(rows);

  const dates = freshness(rows);
  const base = { dryRun, brand, rows, rowsComputed: rows.length, ...dates };

  if (dryRun) {
    return { ...base, rowsWritten: 0, staleDeleted: 0, netChange: 0 };
  }

  const before = await countBrackets(client);

  const { error: upsertError } = await client.from('brand_brackets').upsert(rows, { onConflict: 'canonical_name,platform' });
  if (upsertError) throw new Error(`Upsert failed: ${upsertError.message}`);
  const staleDeleted = await deleteStaleRows(client, rows);
  if (staleDeleted > 0) onProgress(`Removed ${staleDeleted} stale row(s) no longer produced by this recompute.`);

  const after = await countBrackets(client);

  return { ...base, rowsWritten: rows.length, staleDeleted, netChange: after - before };
}

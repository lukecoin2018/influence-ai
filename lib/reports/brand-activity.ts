import type { SupabaseClient } from '@supabase/supabase-js';
import { scoreProfilesByMedianEngagement } from '@/lib/reports/engagement';

/**
 * Shared by both the public /report/[slug] page (using a service-role client,
 * since brand_aliases/v_brand_partnerships are admin-only via RLS and report
 * recipients have no session) and the admin generator (using the normal
 * cookie/anon-key client, since a logged-in admin's session already satisfies
 * brand_aliases' is_admin_user() policy). Every function here just takes a
 * SupabaseClient, so it works with either.
 *
 * Mirrors the join pattern in supabase/migrations/0001_brand_aliases.sql's
 * v_brand_partnerships view (entity_type='brand', is_sponsored=true, distinct
 * by creator_id) but re-implemented in JS rather than queried through the
 * view, because the view's RLS-inherited access is admin-only and because
 * Tier 1/Tier 2 need different alias sets (all brand aliases vs. verified-only).
 *
 * Engagement is never read from the raw social_profiles.engagement_rate
 * column — see lib/reports/engagement.ts. distinctCreators/sponsoredPosts/
 * mostRecentPost are partnership-detection facts and stay based on every
 * detected creator regardless of whether their engagement can be scored;
 * `creators` (used for card display + the median stat) is narrowed to only
 * creators with enough post history to score, per computeMedianEngagement().
 */

export type CreatorStat = {
  creatorId: string;
  handle: string;
  displayName: string;
  platform: 'instagram' | 'tiktok';
  followerCount: number | null;
  engagementRate: number;
};

export type BrandActivity = {
  canonicalName: string;
  category: string | null;
  sponsoredPosts: number;
  distinctCreators: number;
  medianEngagement: number | null;
  mostRecentPost: string | null;
  /** Deduped one-per-creator, engagement-scoreable only, sorted by engagementRate desc. */
  creators: CreatorStat[];
  /** Every distinct creator_id detected for this brand, regardless of engagement scorability — use this for exclusion sets, not `creators`. */
  allCreatorIds: string[];
};

export type ResolvedBrand = {
  canonicalName: string;
  category: string | null;
};

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Finds the canonical brand entity for a report's brand_handle/brand_name, or null if unmatched. */
export async function resolveCanonicalBrand(
  supabase: SupabaseClient,
  { brandHandle, brandName }: { brandHandle: string | null; brandName: string },
): Promise<ResolvedBrand | null> {
  const candidates = [brandHandle, brandName].filter((v): v is string => !!v?.trim());

  for (const candidate of candidates) {
    const { data } = await supabase
      .from('brand_aliases')
      .select('canonical_name, category')
      .eq('entity_type', 'brand')
      .eq('alias', normalizeHandle(candidate))
      .not('canonical_name', 'is', null)
      .maybeSingle();
    if (data?.canonical_name) return { canonicalName: data.canonical_name, category: data.category ?? null };
  }

  const { data } = await supabase
    .from('brand_aliases')
    .select('canonical_name, category')
    .eq('entity_type', 'brand')
    .ilike('canonical_name', brandName.trim())
    .not('canonical_name', 'is', null)
    .limit(1)
    .maybeSingle();

  return data?.canonical_name ? { canonicalName: data.canonical_name, category: data.category ?? null } : null;
}

/** Full activity (posts/creators/engagement) for one canonical brand, or null if it has zero detected sponsored activity. */
export async function getBrandActivity(
  supabase: SupabaseClient,
  canonicalName: string,
  opts: { verifiedOnly?: boolean } = {},
): Promise<BrandActivity | null> {
  let aliasQuery = supabase
    .from('brand_aliases')
    .select('alias, category')
    .eq('entity_type', 'brand')
    .eq('canonical_name', canonicalName);
  if (opts.verifiedOnly) aliasQuery = aliasQuery.eq('verified', true);

  const { data: aliasRows } = await aliasQuery;
  const aliases = (aliasRows ?? []).map((r) => r.alias);
  if (aliases.length === 0) return null;
  const category = aliasRows?.[0]?.category ?? null;

  const { data: posts } = await supabase
    .from('creator_posts')
    .select('id, social_profile_id, posted_at')
    .overlaps('detected_brands', aliases)
    .eq('is_sponsored', true);
  if (!posts || posts.length === 0) return null;

  const profileIds = [...new Set(posts.map((p) => p.social_profile_id))];
  const { data: profiles } = await supabase
    .from('social_profiles')
    .select('id, creator_id, platform, handle, follower_count, creators!inner(display_name)')
    .in('id', profileIds);

  const allCreatorIds = [...new Set((profiles ?? []).map((p) => p.creator_id))];

  const scores = await scoreProfilesByMedianEngagement(
    supabase,
    (profiles ?? []).map((p) => ({ profileId: p.id, followerCount: p.follower_count, platform: p.platform })),
  );

  const byCreator = new Map<string, CreatorStat>();
  for (const p of profiles ?? []) {
    const engagementRate = scores.get(p.id);
    if (engagementRate == null) continue; // fewer than 8 posts — can't be scored, excluded from display/ranking

    const displayNameRaw = (p as unknown as { creators: { display_name: string } | { display_name: string }[] }).creators;
    const displayName = Array.isArray(displayNameRaw) ? displayNameRaw[0]?.display_name : displayNameRaw?.display_name;
    const existing = byCreator.get(p.creator_id);
    // Keep the higher-scoring profile when a creator has posted from multiple platforms for this brand.
    if (!existing || engagementRate > existing.engagementRate) {
      byCreator.set(p.creator_id, {
        creatorId: p.creator_id,
        handle: p.handle,
        displayName: displayName ?? p.handle,
        platform: p.platform,
        followerCount: p.follower_count,
        engagementRate,
      });
    }
  }

  const creators = [...byCreator.values()].sort((a, b) => b.engagementRate - a.engagementRate);
  const mostRecentPost = posts.reduce<string | null>(
    (max, p) => (!max || (p.posted_at && p.posted_at > max) ? p.posted_at : max),
    null,
  );

  return {
    canonicalName,
    category,
    sponsoredPosts: posts.length,
    distinctCreators: allCreatorIds.length,
    medianEngagement: median(creators.map((c) => c.engagementRate)),
    mostRecentPost,
    creators,
    allCreatorIds,
  };
}

/**
 * Cheap first pass for suggestCompetitors(): ranks every category candidate by distinct
 * creator count using 3 total queries (regardless of how many candidates there are), instead
 * of running full getBrandActivity() — with its per-profile engagement-scoring pass over
 * *all* of that profile's post history — for every single candidate. A category like Beauty
 * has ~40 verified canonical brands; the old code ran getBrandActivity() (4+ queries each,
 * including a scoring query per matched profile) for all 40 on every uncached report-page
 * request just to throw away the ~37 that don't make the top 3. This only computes the cheap
 * distinctCreators ranking for all of them, then callers run the expensive full
 * getBrandActivity() for just the handful that actually win.
 */
async function rankCandidatesByCreatorCount(
  supabase: SupabaseClient,
  { excludeCanonicalName, category }: { excludeCanonicalName: string; category: string },
): Promise<{ canonicalName: string; distinctCreators: number }[]> {
  const { data: aliasRows } = await supabase
    .from('brand_aliases')
    .select('alias, canonical_name')
    .eq('entity_type', 'brand')
    .eq('verified', true)
    .eq('category', category)
    .neq('canonical_name', excludeCanonicalName)
    .not('canonical_name', 'is', null);

  const aliasToCanonical = new Map<string, string>();
  for (const row of aliasRows ?? []) aliasToCanonical.set(row.alias, row.canonical_name as string);
  const allAliases = [...aliasToCanonical.keys()];
  if (allAliases.length === 0) return [];

  const { data: posts } = await supabase
    .from('creator_posts')
    .select('social_profile_id, detected_brands')
    .overlaps('detected_brands', allAliases)
    .eq('is_sponsored', true);
  if (!posts || posts.length === 0) return [];

  const profileIdsByCanonical = new Map<string, Set<string>>();
  for (const post of posts) {
    for (const rawBrand of post.detected_brands ?? []) {
      const canonicalName = aliasToCanonical.get(String(rawBrand).toLowerCase());
      if (!canonicalName) continue;
      const set = profileIdsByCanonical.get(canonicalName) ?? new Set<string>();
      set.add(post.social_profile_id);
      profileIdsByCanonical.set(canonicalName, set);
    }
  }

  const allProfileIds = [...new Set(posts.map((p) => p.social_profile_id))];
  const { data: profiles } = await supabase.from('social_profiles').select('id, creator_id').in('id', allProfileIds);
  const creatorIdByProfile = new Map((profiles ?? []).map((p) => [p.id, p.creator_id]));

  return [...profileIdsByCanonical.entries()].map(([canonicalName, profileIds]) => ({
    canonicalName,
    distinctCreators: new Set([...profileIds].map((id) => creatorIdByProfile.get(id)).filter(Boolean)).size,
  }));
}

/** Auto-suggests up to `limit` competitor brands: same category, verified aliases only, >= minCreators distinct creators, ordered by creator count desc. */
export async function suggestCompetitors(
  supabase: SupabaseClient,
  { excludeCanonicalName, category, limit = 3, minCreators = 5 }: { excludeCanonicalName: string; category: string | null; limit?: number; minCreators?: number },
): Promise<BrandActivity[]> {
  if (!category) return [];

  const ranked = await rankCandidatesByCreatorCount(supabase, { excludeCanonicalName, category });
  const winners = ranked
    .filter((r) => r.distinctCreators >= minCreators)
    .sort((a, b) => b.distinctCreators - a.distinctCreators)
    .slice(0, limit);

  // Only the winners get the expensive full computation (engagement scoring, creator cards, etc.).
  const activities = await Promise.all(
    winners.map((w) => getBrandActivity(supabase, w.canonicalName, { verifiedOnly: true })),
  );
  return activities.filter((a): a is BrandActivity => a != null);
}

/**
 * Activity for a specific, admin-chosen list of competitor canonical names, preserving that
 * order. { verifiedOnly: true } is the only render-time gate — never a distinctCreators/
 * minCreators floor. That floor is suggestCompetitors()'s auto-suggest heuristic (it exists so
 * auto-suggest doesn't surface a competitor with only 1-2 detected creators); manual overrides
 * exist precisely so an admin can name a smaller-but-relevant competitor below it. A brand
 * only drops out here if it has zero *verified* aliases (getBrandActivity returns null), or
 * zero detected sponsored activity at all — never for having too few creators.
 */
export async function getCompetitorActivities(
  supabase: SupabaseClient,
  canonicalNames: string[],
): Promise<BrandActivity[]> {
  const activities = await Promise.all(
    canonicalNames.map((name) => getBrandActivity(supabase, name, { verifiedOnly: true })),
  );
  return activities.filter((a): a is BrandActivity => a != null);
}

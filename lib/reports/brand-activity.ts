import type { SupabaseClient } from '@supabase/supabase-js';

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
 */

export type CreatorStat = {
  creatorId: string;
  handle: string;
  displayName: string;
  platform: 'instagram' | 'tiktok';
  followerCount: number | null;
  engagementRate: number | null;
};

export type BrandActivity = {
  canonicalName: string;
  category: string | null;
  sponsoredPosts: number;
  distinctCreators: number;
  medianEngagement: number | null;
  mostRecentPost: string | null;
  /** Deduped one-per-creator, sorted by engagement_rate desc. */
  creators: CreatorStat[];
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
    .select('id, creator_id, platform, handle, follower_count, engagement_rate, creators!inner(display_name)')
    .in('id', profileIds);

  const byCreator = new Map<string, CreatorStat>();
  for (const p of profiles ?? []) {
    const displayNameRaw = (p as unknown as { creators: { display_name: string } | { display_name: string }[] }).creators;
    const displayName = Array.isArray(displayNameRaw) ? displayNameRaw[0]?.display_name : displayNameRaw?.display_name;
    const existing = byCreator.get(p.creator_id);
    // Keep the higher-engagement profile when a creator has posted from multiple platforms for this brand.
    if (!existing || (p.engagement_rate ?? 0) > (existing.engagementRate ?? 0)) {
      byCreator.set(p.creator_id, {
        creatorId: p.creator_id,
        handle: p.handle,
        displayName: displayName ?? p.handle,
        platform: p.platform,
        followerCount: p.follower_count,
        engagementRate: p.engagement_rate,
      });
    }
  }

  const creators = [...byCreator.values()].sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0));
  const mostRecentPost = posts.reduce<string | null>(
    (max, p) => (!max || (p.posted_at && p.posted_at > max) ? p.posted_at : max),
    null,
  );

  return {
    canonicalName,
    category,
    sponsoredPosts: posts.length,
    distinctCreators: creators.length,
    medianEngagement: median(creators.map((c) => c.engagementRate).filter((v): v is number => v != null)),
    mostRecentPost,
    creators,
  };
}

/** Auto-suggests up to `limit` competitor brands: same category, verified aliases only, >= minCreators distinct creators, ordered by creator count desc. */
export async function suggestCompetitors(
  supabase: SupabaseClient,
  { excludeCanonicalName, category, limit = 3, minCreators = 5 }: { excludeCanonicalName: string; category: string | null; limit?: number; minCreators?: number },
): Promise<BrandActivity[]> {
  if (!category) return [];

  const { data: candidateRows } = await supabase
    .from('brand_aliases')
    .select('canonical_name')
    .eq('entity_type', 'brand')
    .eq('verified', true)
    .eq('category', category)
    .neq('canonical_name', excludeCanonicalName)
    .not('canonical_name', 'is', null);

  const candidateNames = [...new Set((candidateRows ?? []).map((r) => r.canonical_name as string))];

  const activities = await Promise.all(
    candidateNames.map((name) => getBrandActivity(supabase, name, { verifiedOnly: true })),
  );

  return activities
    .filter((a): a is BrandActivity => a != null && a.distinctCreators >= minCreators)
    .sort((a, b) => b.distinctCreators - a.distinctCreators)
    .slice(0, limit);
}

/** Activity for a specific, admin-chosen list of competitor canonical names (verified aliases only), preserving that order. */
export async function getCompetitorActivities(
  supabase: SupabaseClient,
  canonicalNames: string[],
): Promise<BrandActivity[]> {
  const activities = await Promise.all(
    canonicalNames.map((name) => getBrandActivity(supabase, name, { verifiedOnly: true })),
  );
  return activities.filter((a): a is BrandActivity => a != null);
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { toSafeCreator, type SafeCreator } from '@/lib/discover/config';
import { computeMedianEngagement } from '@/lib/reports/engagement';

/**
 * Tier 3 ("Recommended for you") match logic — lifted from the original
 * app/report/[slug]/page.tsx fetchAutoMatch/fetchManualMatch, extended to:
 *  - also select `handle` (the original intentionally omitted it since every
 *    matched creator was blurred; now the top 3 are shown fully named, so
 *    they need a handle to link to). Blurred cards still never see it —
 *    toSafeCreator() ignores the field entirely.
 *  - accept a set of creator_ids to exclude (creators already doing sponsored
 *    work for a Tier 2 competitor), and fetch a wider pool so exclusion still
 *    leaves enough matches.
 *  - rank and display by computeMedianEngagement() (top_creators()'s
 *    methodology), never the raw social_profiles.engagement_rate column —
 *    that column has no post-count floor or outlier cap and can be wildly
 *    wrong (observed 174.6%/99.5% on a live report). A candidate that can't
 *    be scored (fewer than 8 posts) is dropped, not shown with a fallback.
 */

export type MatchedCreator = {
  creatorId: string;
  handle: string;
  displayName: string;
  platform: 'instagram' | 'tiktok';
  followerCount: number | null;
  /** Median-post engagement, capped per platform — never the raw stored engagement_rate. */
  engagementRate: number;
  /** Blurred/anonymized view — used for everything past the top 3. */
  safe: SafeCreator;
};

// engagement_rate deliberately excluded — never selected, so it can never leak into ranking or display.
const BASE_SELECT =
  'id, creator_id, handle, display_name:creators!inner(display_name), platform, follower_count, detected_city, detected_country, ai_summary';

const TAG_CANDIDATES = [
  'Beauty', 'Fashion', 'Fitness', 'Lifestyle', 'Travel',
  'Food', 'Wellness', 'Skincare', 'Gaming', 'Tech',
  'Nutrition', 'Comedy', 'Parenting',
];

type RawRow = {
  id: string;
  creator_id: string;
  handle: string;
  display_name: unknown;
  platform: string | null;
  follower_count: number | null;
  detected_city: string | null;
  detected_country: string | null;
  ai_summary: string | null;
};

type Candidate = {
  profileId: string;
  creatorId: string;
  handle: string;
  displayName: string;
  platform: 'instagram' | 'tiktok';
  followerCount: number | null;
  safe: SafeCreator;
};

function toCandidate(row: RawRow): Candidate {
  const rawName = row.display_name as { display_name?: string } | string | null;
  const displayName = (typeof rawName === 'object' && rawName !== null ? rawName.display_name : rawName) || row.handle;
  return {
    profileId: row.id,
    creatorId: row.creator_id,
    handle: row.handle,
    displayName,
    platform: (row.platform as 'instagram' | 'tiktok') || 'instagram',
    followerCount: row.follower_count,
    safe: toSafeCreator(row),
  };
}

async function fetchAutoMatch(
  supabase: SupabaseClient,
  brandHandle: string,
  fallbackCategory: string | null,
  poolSize: number,
): Promise<Candidate[]> {
  const { data: partners } = await supabase
    .from('social_profiles')
    .select('creator_id, ai_summary')
    .ilike('enrichment_data::text', `%"${brandHandle}"%`)
    .limit(50);

  if (!partners || partners.length === 0) {
    if (fallbackCategory) return fetchManualMatch(supabase, fallbackCategory, poolSize);
    return [];
  }

  const counts: Record<string, number> = {};
  for (const p of partners) {
    const summary = (p.ai_summary || '').toLowerCase();
    for (const tag of TAG_CANDIDATES) {
      if (summary.includes(tag.toLowerCase())) counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!topCategory) return fetchManualMatch(supabase, fallbackCategory ?? 'Lifestyle', poolSize);

  const partnerIds = partners.map((p: { creator_id: string }) => p.creator_id);

  const { data: rawCreators } = await supabase
    .from('social_profiles')
    .select(BASE_SELECT)
    .ilike('ai_summary', `%${topCategory}%`)
    .not('creator_id', 'in', `(${partnerIds.join(',')})`)
    .gte('follower_count', 50_000)
    .lte('follower_count', 500_000)
    .order('follower_count', { ascending: false })
    .limit(poolSize);

  return (rawCreators ?? []).map((r) => toCandidate(r as unknown as RawRow));
}

async function fetchManualMatch(
  supabase: SupabaseClient,
  category: string,
  poolSize: number,
): Promise<Candidate[]> {
  const { data: rawCreators } = await supabase
    .from('social_profiles')
    .select(BASE_SELECT)
    .ilike('ai_summary', `%${category}%`)
    .gte('follower_count', 50_000)
    .lte('follower_count', 500_000)
    .order('follower_count', { ascending: false })
    .limit(poolSize);

  return (rawCreators ?? []).map((r) => toCandidate(r as unknown as RawRow));
}

/** Scores each candidate via computeMedianEngagement(); drops anyone who can't be scored (fewer than 8 posts). */
async function rankByMedianEngagement(supabase: SupabaseClient, candidates: Candidate[]): Promise<MatchedCreator[]> {
  if (candidates.length === 0) return [];

  const profileIds = candidates.map((c) => c.profileId);
  const { data: posts } = await supabase
    .from('creator_posts')
    .select('social_profile_id, likes_count, comments_count')
    .in('social_profile_id', profileIds);

  const postsByProfile = new Map<string, { likes_count: number | null; comments_count: number | null }[]>();
  for (const p of posts ?? []) {
    const list = postsByProfile.get(p.social_profile_id) ?? [];
    list.push({ likes_count: p.likes_count, comments_count: p.comments_count });
    postsByProfile.set(p.social_profile_id, list);
  }

  const scored: MatchedCreator[] = [];
  for (const c of candidates) {
    const engagementRate = computeMedianEngagement(postsByProfile.get(c.profileId) ?? [], c.followerCount, c.platform);
    if (engagementRate == null) continue; // fewer than 8 posts — can't be scored, not shown
    scored.push({
      creatorId: c.creatorId,
      handle: c.handle,
      displayName: c.displayName,
      platform: c.platform,
      followerCount: c.followerCount,
      engagementRate,
      safe: c.safe,
    });
  }

  return scored.sort((a, b) => b.engagementRate - a.engagementRate);
}

export async function getMatchedCreators(
  supabase: SupabaseClient,
  {
    mode,
    brandHandle,
    category,
    excludeCreatorIds,
    limit,
  }: {
    mode: 'auto' | 'manual';
    brandHandle: string | null;
    category: string | null;
    excludeCreatorIds: Set<string>;
    limit: number;
  },
): Promise<MatchedCreator[]> {
  // Fetch a much wider pool than needed: beyond excluded creators, scoring also drops
  // anyone with fewer than 8 posts, so the raw candidate pool needs real headroom.
  const poolSize = Math.min((limit + excludeCreatorIds.size + 10) * 3, 150);

  let candidates: Candidate[];
  if (mode === 'auto' && brandHandle) {
    candidates = await fetchAutoMatch(supabase, brandHandle, category, poolSize);
  } else if (category) {
    candidates = await fetchManualMatch(supabase, category, poolSize);
  } else {
    candidates = [];
  }

  const ranked = await rankByMedianEngagement(supabase, candidates);
  return ranked.filter((m) => !excludeCreatorIds.has(m.creatorId)).slice(0, limit);
}

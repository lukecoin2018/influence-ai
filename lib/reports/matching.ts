import type { SupabaseClient } from '@supabase/supabase-js';
import { toSafeCreator, type SafeCreator } from '@/lib/discover/config';

/**
 * Tier 3 ("Recommended for you") match logic — lifted from the original
 * app/report/[slug]/page.tsx fetchAutoMatch/fetchManualMatch, extended to:
 *  - also select `handle` (the original intentionally omitted it since every
 *    matched creator was blurred; now the top 5 are shown fully named, so
 *    they need a handle to link to). Blurred cards still never see it —
 *    toSafeCreator() ignores the field entirely.
 *  - accept a set of creator_ids to exclude (creators already doing sponsored
 *    work for a Tier 2 competitor), and fetch a wider pool so exclusion still
 *    leaves enough matches.
 */

export type MatchedCreator = {
  creatorId: string;
  handle: string;
  displayName: string;
  platform: 'instagram' | 'tiktok';
  followerCount: number | null;
  engagementRate: number | null;
  /** Blurred/anonymized view — used for everything past the top 5. */
  safe: SafeCreator;
};

const BASE_SELECT =
  'creator_id, handle, display_name:creators!inner(display_name), platform, follower_count, detected_city, detected_country, ai_summary, engagement_rate';

const TAG_CANDIDATES = [
  'Beauty', 'Fashion', 'Fitness', 'Lifestyle', 'Travel',
  'Food', 'Wellness', 'Skincare', 'Gaming', 'Tech',
  'Nutrition', 'Comedy', 'Parenting',
];

type RawRow = {
  creator_id: string;
  handle: string;
  display_name: unknown;
  platform: string | null;
  follower_count: number | null;
  detected_city: string | null;
  detected_country: string | null;
  ai_summary: string | null;
  engagement_rate: number | null;
};

function toMatched(row: RawRow): MatchedCreator {
  const rawName = row.display_name as { display_name?: string } | string | null;
  const displayName = (typeof rawName === 'object' && rawName !== null ? rawName.display_name : rawName) || row.handle;
  return {
    creatorId: row.creator_id,
    handle: row.handle,
    displayName,
    platform: (row.platform as 'instagram' | 'tiktok') || 'instagram',
    followerCount: row.follower_count,
    engagementRate: row.engagement_rate,
    safe: toSafeCreator(row),
  };
}

async function fetchAutoMatch(
  supabase: SupabaseClient,
  brandHandle: string,
  fallbackCategory: string | null,
  poolSize: number,
): Promise<MatchedCreator[]> {
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
    .order('engagement_rate', { ascending: false })
    .limit(poolSize);

  return (rawCreators ?? []).map((r) => toMatched(r as unknown as RawRow));
}

async function fetchManualMatch(
  supabase: SupabaseClient,
  category: string,
  poolSize: number,
): Promise<MatchedCreator[]> {
  const { data: rawCreators } = await supabase
    .from('social_profiles')
    .select(BASE_SELECT)
    .ilike('ai_summary', `%${category}%`)
    .gte('follower_count', 50_000)
    .lte('follower_count', 500_000)
    .order('engagement_rate', { ascending: false })
    .limit(poolSize);

  return (rawCreators ?? []).map((r) => toMatched(r as unknown as RawRow));
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
  // Fetch a wider pool than needed so filtering out excluded creators still leaves `limit` matches.
  const poolSize = limit + excludeCreatorIds.size + 10;

  let matches: MatchedCreator[];
  if (mode === 'auto' && brandHandle) {
    matches = await fetchAutoMatch(supabase, brandHandle, category, poolSize);
  } else if (category) {
    matches = await fetchManualMatch(supabase, category, poolSize);
  } else {
    matches = [];
  }

  return matches.filter((m) => !excludeCreatorIds.has(m.creatorId)).slice(0, limit);
}

/**
 * Read layer for the creator-side brand-intelligence feature: given a creator
 * (handle or id), returns their ranked list of matched verified brands.
 *
 * Matching is on-demand (no per-creator precompute) against the small,
 * manually-refreshed `brand_brackets` cache (~1,160 rows) — a creator matches
 * a brand when their per-platform follower_count falls in
 * [p25 x 0.7, p75 x 1.3] and platform aligns. `brand_brackets` has RLS enabled
 * with no policies (service-role only) — callers MUST pass a service-role
 * client (lib/supabase-admin.ts's createSupabaseAdminClient()); an anon/cookie
 * client will silently get zero rows back, not an error.
 *
 * No engagement figure anywhere here — the design doesn't show one.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/withTimeout';
import { bucketRecency, recencyBucketRank, type RecencyBucket } from '@/lib/reports/recency-bucket';
import { matchRegion, type RegionMatch } from '@/lib/reports/region-match';

const DB_TIMEOUT_MS = 10_000;

// LOCKED matching/ranking constants (confirmed with the founder in Phase 1 — not invented here).
const BRACKET_LOW_MULTIPLIER = 0.7;
const BRACKET_HIGH_MULTIPLIER = 1.3;
const PROGRAM_MIN_DISTINCT_CREATORS = 3;
const REPEAT_HIRER_MIN_RATIO = 2;
const TEASER_PREVIEW_MAX = 3;

export type Platform = 'instagram' | 'tiktok';

export type BrandBracketRow = {
  canonicalName: string;
  platform: Platform;
  category: string | null;
  p25Followers: number;
  p75Followers: number;
  distinctCreators: number;
  repeatRatio: number;
  mostRecentPost: string | null;
  regions: string[];
};

export type CreatorProfile = {
  platform: Platform;
  followerCount: number;
};

export type MatchedBrand = {
  canonicalName: string;
  category: string | null;
  /** Which of the creator's platforms produced this match — after cross-platform dedupe, the higher-ranked one. */
  platform: Platform;
  isProgram: boolean;
  isRepeatHirer: boolean;
  p25Followers: number;
  p75Followers: number;
  distinctCreators: number;
  repeatRatio: number;
  mostRecentPost: string | null;
  recencyBucket: RecencyBucket;
  regionMatch: RegionMatch;
};

/** The gated-row shape: category, distinctCreators, recencyBucket, and the program/repeat-hirer badge — never canonicalName or the exact bracket. */
export type BlurredMatch = {
  category: string | null;
  isProgram: boolean;
  isRepeatHirer: boolean;
  distinctCreators: number;
  recencyBucket: RecencyBucket;
};

export type CreatorBrandMatches = {
  /** Follower count of the platform that produced strongestMatch, so the page headline agrees with the hero card. Null when there's no match to anchor it to. */
  creatorFollowers: number | null;
  totalMatchCount: number;
  /** Full ranked list, full fields — dashboard consumer picks how much of this to unlock. */
  matches: MatchedBrand[];
  strongestMatch: MatchedBrand | null;
  /** Up to 3 additional matches beyond strongestMatch, blurred-shape — for the teaser's "+N more" preview stack. */
  teaserPreview: BlurredMatch[];
};

function toBlurred(m: MatchedBrand): BlurredMatch {
  return { category: m.category, isProgram: m.isProgram, isRepeatHirer: m.isRepeatHirer, distinctCreators: m.distinctCreators, recencyBucket: m.recencyBucket };
}

/**
 * LOCKED ranking (confirmed Phase 1): isProgram before sightings, then recency
 * bucket, then repeat-ratio, then region as a tiebreak only (never lets a
 * weaker-but-local brand outrank a genuinely stronger one), then raw recency
 * as the final tiebreak.
 */
function compareMatches(a: MatchedBrand, b: MatchedBrand): number {
  if (a.isProgram !== b.isProgram) return a.isProgram ? -1 : 1;

  const recencyDiff = recencyBucketRank(a.recencyBucket) - recencyBucketRank(b.recencyBucket);
  if (recencyDiff !== 0) return recencyDiff;

  if (a.repeatRatio !== b.repeatRatio) return b.repeatRatio - a.repeatRatio;

  const aRegion = a.regionMatch ? 1 : 0;
  const bRegion = b.regionMatch ? 1 : 0;
  if (aRegion !== bRegion) return bRegion - aRegion;

  return (b.mostRecentPost ?? '').localeCompare(a.mostRecentPost ?? '');
}

/**
 * Pure matching + dedupe + ranking + shaping — no I/O, fully unit-testable.
 * `candidateBrackets` is expected to already be bracket-filtered per platform
 * (the I/O wrapper pushes that down to SQL against the brand_brackets index);
 * this function re-checks the same overlap rule anyway so it stays correct
 * independent of how the caller fetched the candidates.
 */
export function buildCreatorBrandMatches(
  country: string | null,
  profiles: CreatorProfile[],
  candidateBrackets: BrandBracketRow[],
  now: Date,
): CreatorBrandMatches {
  const followerCountByPlatform = new Map(profiles.map((p) => [p.platform, p.followerCount]));

  const candidates: MatchedBrand[] = candidateBrackets
    .filter((b) => {
      const followerCount = followerCountByPlatform.get(b.platform);
      if (followerCount == null) return false;
      return followerCount >= b.p25Followers * BRACKET_LOW_MULTIPLIER && followerCount <= b.p75Followers * BRACKET_HIGH_MULTIPLIER;
    })
    .map((b) => ({
      canonicalName: b.canonicalName,
      category: b.category,
      platform: b.platform,
      isProgram: b.distinctCreators >= PROGRAM_MIN_DISTINCT_CREATORS,
      isRepeatHirer: b.repeatRatio >= REPEAT_HIRER_MIN_RATIO,
      p25Followers: b.p25Followers,
      p75Followers: b.p75Followers,
      distinctCreators: b.distinctCreators,
      repeatRatio: b.repeatRatio,
      mostRecentPost: b.mostRecentPost,
      recencyBucket: bucketRecency(b.mostRecentPost, now),
      regionMatch: matchRegion(country, b.regions),
    }));

  // Cross-platform dedupe: one row per canonicalName, keep the higher-ranked platform match.
  const byCanonical = new Map<string, MatchedBrand>();
  for (const c of candidates) {
    const existing = byCanonical.get(c.canonicalName);
    if (!existing || compareMatches(c, existing) < 0) byCanonical.set(c.canonicalName, c);
  }

  const matches = [...byCanonical.values()].sort(compareMatches);
  const strongestMatch = matches[0] ?? null;

  return {
    creatorFollowers: strongestMatch ? (followerCountByPlatform.get(strongestMatch.platform) ?? null) : null,
    totalMatchCount: matches.length,
    matches,
    strongestMatch,
    teaserPreview: matches.slice(1, 1 + TEASER_PREVIEW_MAX).map(toBlurred),
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

type RawSocialProfileRow = { platform: Platform; follower_count: number | null };
type RawBracketRow = {
  canonical_name: string;
  platform: Platform;
  category: string | null;
  p25_followers: number;
  p75_followers: number;
  distinct_creators: number;
  repeat_ratio: number;
  most_recent_post: string | null;
  regions: string[] | null;
};

async function resolveCreatorId(supabase: SupabaseClient, handleOrId: string): Promise<string | null> {
  if (isUuid(handleOrId)) return handleOrId;

  const { data } = await withTimeout(
    Promise.resolve(
      supabase.from('social_profiles').select('creator_id').eq('handle', normalizeHandle(handleOrId)).limit(1).maybeSingle(),
    ),
    DB_TIMEOUT_MS,
  );
  return (data as { creator_id: string } | null)?.creator_id ?? null;
}

/**
 * Resolves a creator (by handle or creator_id — works for UNCLAIMED creators,
 * since this reads social_profiles/creators, never creator_profiles), matches
 * them against brand_brackets, and returns the ranked list. Returns null only
 * when the creator itself can't be resolved; a resolved creator with zero
 * qualifying matches returns a valid zero-match result, not null.
 */
export async function getCreatorBrandMatches(supabase: SupabaseClient, handleOrId: string): Promise<CreatorBrandMatches | null> {
  const creatorId = await resolveCreatorId(supabase, handleOrId);
  if (!creatorId) return null;

  const [creatorResult, profilesResult] = await Promise.all([
    withTimeout(Promise.resolve(supabase.from('creators').select('id, country').eq('id', creatorId).maybeSingle()), DB_TIMEOUT_MS),
    withTimeout(Promise.resolve(supabase.from('social_profiles').select('platform, follower_count').eq('creator_id', creatorId)), DB_TIMEOUT_MS),
  ]);

  const creatorRow = creatorResult.data as { id: string; country: string | null } | null;
  if (!creatorRow) return null; // resolved a creator_id but the creators row is gone — never invent

  const profiles: CreatorProfile[] = ((profilesResult.data ?? []) as RawSocialProfileRow[])
    .filter((p): p is RawSocialProfileRow & { follower_count: number } => p.follower_count != null)
    .map((p) => ({ platform: p.platform, followerCount: p.follower_count }));

  if (profiles.length === 0) {
    return { creatorFollowers: null, totalMatchCount: 0, matches: [], strongestMatch: null, teaserPreview: [] };
  }

  // Pushed down to the idx_brand_brackets_platform_bracket index (supabase/migrations/0007):
  // follower_count >= p25*0.7 && follower_count <= p75*1.3
  //   <=> p25 <= follower_count/0.7 && p75 >= follower_count/1.3
  const bracketResults = await Promise.all(
    profiles.map((p) =>
      withTimeout(
        Promise.resolve(
          supabase
            .from('brand_brackets')
            .select('canonical_name, platform, category, p25_followers, p75_followers, distinct_creators, repeat_ratio, most_recent_post, regions')
            .eq('platform', p.platform)
            .lte('p25_followers', p.followerCount / BRACKET_LOW_MULTIPLIER)
            .gte('p75_followers', p.followerCount / BRACKET_HIGH_MULTIPLIER),
        ),
        DB_TIMEOUT_MS,
      ),
    ),
  );

  const candidateBrackets: BrandBracketRow[] = bracketResults.flatMap((result) =>
    ((result.data ?? []) as RawBracketRow[]).map((r) => ({
      canonicalName: r.canonical_name,
      platform: r.platform,
      category: r.category,
      p25Followers: r.p25_followers,
      p75Followers: r.p75_followers,
      distinctCreators: r.distinct_creators,
      repeatRatio: r.repeat_ratio,
      mostRecentPost: r.most_recent_post,
      regions: r.regions ?? [],
    })),
  );

  return buildCreatorBrandMatches(creatorRow.country, profiles, candidateBrackets, new Date());
}

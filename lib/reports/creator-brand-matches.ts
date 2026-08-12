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
import { consolidateCategory, nicheLeadBucket } from '@/lib/reports/category-consolidation';

/** Ranking magnitude ceiling: at or above this many distinct creators, brands tie on term 1 and the later terms decide. Tuned against real teasers — keep it here, not inline. */
export const HERO_MAGNITUDE_CAP = 10;
/** Minimum distinct_creators before a niche-matching brand may be promoted to the hero card. Tuned against real teasers — keep it here, not inline. */
export const HERO_CATEGORY_FLOOR = 5;

const DB_TIMEOUT_MS = 10_000;

// LOCKED matching/ranking constants (confirmed with the founder in Phase 1 — not invented here).
const BRACKET_LOW_MULTIPLIER = 0.7;
const BRACKET_HIGH_MULTIPLIER = 1.3;
// Badge thresholds only — NOT ranking terms. isProgram/isRepeatHirer left the
// comparator when magnitude replaced them (isProgram was distinct_creators >= 3,
// which term 1 subsumes), but both still drive the Program / Repeat-hirer badges
// (app/claim/[handle]/_data.ts's badgeFor) and the admin targeting sort.
const PROGRAM_MIN_DISTINCT_CREATORS = 3;
const REPEAT_HIRER_MIN_RATIO = 2;
const TEASER_PREVIEW_MAX = 3;

/**
 * How many canonical_names go into one `.in()` when looking up brand handles.
 *
 * Chunked rather than issued as a single query, for two independent reasons —
 * either one alone would be enough:
 *  - PostgREST puts `.in()` values in the query string, and a creator can match
 *    up to ~1,050 brands. One request would build a multi-kilobyte URL.
 *  - Supabase enforces a server-side max-rows cap (1,000 by default) that a
 *    client `.limit()` cannot raise. A single unchunked read could be silently
 *    truncated — the failure mode being brands quietly losing their handles,
 *    with no error anywhere.
 */
const HANDLE_LOOKUP_CHUNK = 100;

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

/**
 * One Instagram handle belonging to a brand.
 *
 * `brand_aliases.alias` IS the Instagram handle — there is no separate handle
 * column, and the `brands` table is deliberately not used for this (its
 * brand_name is null for ~99% of rows and it joins at ~2%). Coverage via
 * brand_aliases is structural rather than lucky: brand_brackets is built FROM
 * verified aliases (scripts/brand-brackets/refresh.ts), so every bracketed
 * brand has at least one.
 */
export type BrandHandle = {
  /** Normalized: trimmed, leading @ stripped, lowercased — same rule as social_profiles.handle. */
  handle: string;
  /** brand_aliases.region for THIS alias, raw and unnormalized. Null when the alias carries no region tag. */
  region: string | null;
  /**
   * True when this alias's own region resolves to the creator's country.
   * An ORDERING signal only — never a filter and never a penalty, per the
   * additive-region rule. A creator may deliberately approach a regional
   * account over the global one, so every handle is always returned.
   */
  isRegionMatch: boolean;
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
  /**
   * Every verified Instagram handle for this brand, region-matching ones first
   * (then alphabetical, so the order is stable across renders).
   *
   * Populated only by getCreatorBrandMatches() — the pure builder below has no
   * I/O and always emits []. Empty is a legitimate value, not an error: the
   * lookup degrades to [] if brand_aliases is unreadable, because a missing
   * handle must never cost a creator their Brands Hiring list.
   */
  handles: BrandHandle[];
};

/** The gated-row shape: category, distinctCreators, recencyBucket, and the program/repeat-hirer badge — never canonicalName or the exact bracket. */
export type BlurredMatch = {
  category: string | null;
  isProgram: boolean;
  isRepeatHirer: boolean;
  distinctCreators: number;
  recencyBucket: RecencyBucket;
};

/**
 * Everything derivable from brackets + profiles alone. buildCreatorBrandMatches()
 * is pure and never learns WHICH creator it ran for, so creator identity is
 * added by the I/O wrapper rather than threaded through the matcher.
 */
export type BrandMatchResult = {
  /** Follower count of the platform that produced strongestMatch, so the page headline agrees with the hero card. Null when there's no match to anchor it to. */
  creatorFollowers: number | null;
  totalMatchCount: number;
  /** Full ranked list, full fields — dashboard consumer picks how much of this to unlock. */
  matches: MatchedBrand[];
  strongestMatch: MatchedBrand | null;
  /** Up to 3 additional matches beyond strongestMatch, blurred-shape — for the teaser's "+N more" preview stack. */
  teaserPreview: BlurredMatch[];
};

export type CreatorBrandMatches = BrandMatchResult & {
  /**
   * The resolved creators.id. Always present: getCreatorBrandMatches() returns
   * null whenever resolution fails, so a result existing at all means the id
   * is known.
   *
   * Carried out because resolveCreatorId() below already paid for it. The
   * claim teaser calls this function with a handle and then needs the id for
   * funnel capture — without this field that would be a second, identical
   * social_profiles lookup on every teaser render.
   */
  creatorId: string;
};

function toBlurred(m: MatchedBrand): BlurredMatch {
  return { category: m.category, isProgram: m.isProgram, isRepeatHirer: m.isRepeatHirer, distinctCreators: m.distinctCreators, recencyBucket: m.recencyBucket };
}

/**
 * Capped sighting count — term 1 of the ranking.
 *
 * Capped rather than raw so magnitude decides only up to the point where it
 * still means something: a brand detected with 40 creators is not four times
 * the opportunity of one detected with 10, and ranking on the raw count lets a
 * handful of very large brands monopolize every creator's hero card. Above the
 * cap, brands tie here and recency/region decide instead.
 */
function heroMagnitude(m: MatchedBrand): number {
  return Math.min(m.distinctCreators, HERO_MAGNITUDE_CAP);
}

/**
 * Ranking, in strict lexicographic precedence:
 *   1. capped magnitude desc — see heroMagnitude()
 *   2. recency bucket        — active < window < neutral
 *   3. region                — tiebreak only, never lets a weaker-but-local
 *                              brand outrank a genuinely stronger one
 *   4. raw most_recent_post desc
 *   5. canonicalName asc     — final tiebreak, so the order is fully
 *                              deterministic rather than left to the input
 *                              order of two otherwise-identical brands
 *
 * Replaces the previous isProgram/recency/repeatRatio/region/recency order.
 * isProgram was exactly `distinct_creators >= 3`, which term 1 subsumes at
 * finer resolution; repeatRatio (sponsored posts per creator) is dropped
 * outright, since a brand that posted twice about one creator was outranking a
 * brand that worked with twenty.
 *
 * NOTHING is filtered here. A brand with one distinct creator sorts last; it is
 * never excluded, because a creator with a thin match set must still get cards.
 */
function compareMatches(a: MatchedBrand, b: MatchedBrand): number {
  const magnitudeDiff = heroMagnitude(b) - heroMagnitude(a);
  if (magnitudeDiff !== 0) return magnitudeDiff;

  const recencyDiff = recencyBucketRank(a.recencyBucket) - recencyBucketRank(b.recencyBucket);
  if (recencyDiff !== 0) return recencyDiff;

  const aRegion = a.regionMatch ? 1 : 0;
  const bRegion = b.regionMatch ? 1 : 0;
  if (aRegion !== bRegion) return bRegion - aRegion;

  const postDiff = (b.mostRecentPost ?? '').localeCompare(a.mostRecentPost ?? '');
  if (postDiff !== 0) return postDiff;

  return a.canonicalName.localeCompare(b.canonicalName);
}

/**
 * The brand that leads the claim teaser — `sortedMatches[0]`, unless the
 * creator's own detected niche maps to a bucket they have a substantial match
 * in, in which case that one is promoted.
 *
 * Additive by construction: it only ever promotes a brand that ALREADY cleared
 * HERO_CATEGORY_FLOOR, and never demotes, filters or excludes anything. The
 * floor is what keeps it honest — leading with a niche-matching brand detected
 * on two creators would be a worse card than the top-ranked one, not a better
 * one, so the gate declines to fire and falls back.
 *
 * Takes an ALREADY-SORTED array and returns its first qualifying element, so
 * the promoted brand is the strongest one in the bucket, not merely the first
 * one the DB happened to return.
 */
export function selectHeroBrand(sortedMatches: MatchedBrand[], detectedNiche: string | null): MatchedBrand | null {
  const fallback = sortedMatches[0] ?? null;

  // nicheLeadBucket() rather than the raw map: it already returns null for a
  // null niche AND for the niches deliberately left unmapped (luxury, gaming,
  // lifestyle — see its docstring), which is exactly the fall-back-to-top case.
  const bucket = nicheLeadBucket(detectedNiche);
  if (!bucket) return fallback;

  // match.category is the RAW brand_brackets value; the bucket is already
  // consolidated. Consolidating the match side is what makes this compare like
  // with like.
  const promoted = sortedMatches.find(
    (m) => consolidateCategory(m.category) === bucket && m.distinctCreators >= HERO_CATEGORY_FLOOR,
  );
  return promoted ?? fallback;
}

/**
 * The blurred "+N more" rows for the teaser, excluding whichever match the hero
 * card is already showing.
 *
 * Exists because the hero is no longer necessarily matches[0]: slicing from
 * index 1 (what BrandMatchResult.teaserPreview still does) would render a
 * promoted hero a second time as a blurred row directly beneath its own card.
 * Matched on canonicalName, which is unique — the list is deduped on it.
 */
export function teaserPreviewExcluding(sortedMatches: MatchedBrand[], hero: MatchedBrand | null): BlurredMatch[] {
  return sortedMatches
    .filter((m) => m.canonicalName !== hero?.canonicalName)
    .slice(0, TEASER_PREVIEW_MAX)
    .map(toBlurred);
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
): BrandMatchResult {
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
      // Always [] here. This function is pure and does no I/O; the handles are
      // attached by getCreatorBrandMatches() after ranking, so only the brands
      // that actually matched are ever looked up.
      handles: [],
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

/**
 * The ranking clock, snapped to the start of the UTC day.
 *
 * /claim/[handle] is force-dynamic, so every render re-evaluates the clock and
 * re-buckets recency against it. Unsnapped, a brand sitting on the 28-day or
 * 90-day boundary (lib/reports/recency-bucket.ts) crosses it partway through a
 * day and the creator's hero card silently changes between two loads of the
 * same URL. Snapping means the ranking can only change on a day boundary or on
 * a brand_brackets refresh.
 *
 * UTC rather than local: the VPS and Vercel need not agree on a timezone, and
 * the same creator must not get a different hero from the two.
 */
function rankingClock(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
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

type RawAliasRow = { alias: string; canonical_name: string; region: string | null };

/** Region-matching handles first, then alphabetical so the order never shuffles between renders. */
function compareHandles(a: BrandHandle, b: BrandHandle): number {
  if (a.isRegionMatch !== b.isRegionMatch) return a.isRegionMatch ? -1 : 1;
  return a.handle.localeCompare(b.handle);
}

/**
 * Looks up the Instagram handles for a set of matched brands.
 *
 * `brand_aliases` is admin-only via RLS (supabase/migrations/0001), so this
 * relies on the same service-role client the rest of this module already
 * requires. Filtered to entity_type='brand' AND verified=true — the exact
 * population brand_brackets is built from, which is why coverage is structural.
 *
 * Never throws and never rejects the caller: any failure returns an empty map
 * and the brands simply render without handles. Brands Hiring existed before
 * handles did and must keep working if this lookup does not.
 */
async function fetchBrandHandles(
  supabase: SupabaseClient,
  canonicalNames: string[],
  country: string | null,
): Promise<Map<string, BrandHandle[]>> {
  const byCanonical = new Map<string, BrandHandle[]>();
  if (canonicalNames.length === 0) return byCanonical;

  const chunks: string[][] = [];
  for (let i = 0; i < canonicalNames.length; i += HANDLE_LOOKUP_CHUNK) {
    chunks.push(canonicalNames.slice(i, i + HANDLE_LOOKUP_CHUNK));
  }

  try {
    const results = await Promise.all(
      chunks.map((chunk) =>
        withTimeout(
          Promise.resolve(
            supabase
              .from('brand_aliases')
              .select('alias, canonical_name, region')
              .eq('entity_type', 'brand')
              .eq('verified', true)
              .in('canonical_name', chunk),
          ),
          DB_TIMEOUT_MS,
        ),
      ),
    );

    for (const result of results) {
      if (result.error) {
        // Warned rather than swallowed, for the same reason lib/funnel/events.ts
        // warns: a partial result and a broken query look identical otherwise.
        console.warn(`[brand-matches] handle lookup failed, continuing without handles: ${result.error.message}`);
        continue;
      }

      for (const row of (result.data ?? []) as RawAliasRow[]) {
        const handle = normalizeHandle(row.alias);
        if (!handle) continue;
        const list = byCanonical.get(row.canonical_name) ?? [];
        list.push({
          handle,
          region: row.region,
          // matchRegion takes a LIST of brand regions; an alias carries at most
          // one. Null country or an unmapped region degrades to false, which
          // only affects ordering — the handle is still returned.
          isRegionMatch: matchRegion(country, row.region ? [row.region] : []) != null,
        });
        byCanonical.set(row.canonical_name, list);
      }
    }
  } catch (err) {
    console.warn('[brand-matches] handle lookup threw, continuing without handles:', err);
    return byCanonical;
  }

  for (const list of byCanonical.values()) list.sort(compareHandles);
  return byCanonical;
}

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
    return { creatorId, creatorFollowers: null, totalMatchCount: 0, matches: [], strongestMatch: null, teaserPreview: [] };
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
            .gte('p75_followers', p.followerCount / BRACKET_HIGH_MULTIPLIER)
            // Free — canonical_name is the leading column of the primary key
            // (canonical_name, platform). Belt-and-braces rather than load
            // bearing: the comparator's canonicalName tiebreak already makes
            // the ranking a total order over distinct brands, so input order
            // can't change the output. This keeps that true independently of
            // the comparator, and makes the fetch itself reproducible.
            .order('canonical_name'),
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

  const result = buildCreatorBrandMatches(creatorRow.country, profiles, candidateBrackets, rankingClock(new Date()));

  // Handles are looked up AFTER ranking, against the matched brands only —
  // typically a fraction of the ~1,160 bracket rows scanned above.
  const handlesByCanonical = await fetchBrandHandles(
    supabase,
    result.matches.map((m) => m.canonicalName),
    creatorRow.country,
  );

  // Rebuilt rather than mutated, and strongestMatch is re-derived from the new
  // array rather than spread separately: buildCreatorBrandMatches() returns
  // matches[0] AS strongestMatch (same object), and callers rely on the two
  // agreeing. Re-deriving keeps that identity intact.
  const matches = result.matches.map((m) => ({ ...m, handles: handlesByCanonical.get(m.canonicalName) ?? [] }));

  return { creatorId, ...result, matches, strongestMatch: matches[0] ?? null };
}

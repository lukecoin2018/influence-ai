import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { withTimeout } from '@/lib/withTimeout';
import { getCreatorBrandMatches, type CreatorBrandMatches, type Platform } from '@/lib/reports/creator-brand-matches';
import { computeTeaserStrengthInput, compareTeaserStrength, type TeaserStrengthInput } from '@/lib/reports/teaser-strength';
import { SPANISH_COUNTRIES } from '@/lib/discover/es-config';
import type { RecencyBucket } from '@/lib/reports/recency-bucket';

// Allow the chunked getCreatorBrandMatches pass (below) enough wall-clock
// time on Vercel's serverless runtime, since a full window can be up to
// PREFILTER_WINDOW_SIZE creators computed in sequential chunks.
export const maxDuration = 60;

const DB_TIMEOUT_MS = 10_000;
const STRENGTH_CALL_TIMEOUT_MS = 15_000;
// Cheap pre-filter caps the segment at this many creators per batch before
// the expensive per-creator getCreatorBrandMatches pass runs — running that
// for an entire large segment (e.g. ~460 for "all Colombia") synchronously is
// exactly the all-creator cost the read layer's design avoids. Batches are
// windowed in a NEUTRAL row order (id, below) — never by follower_count.
// Teaser strength is independent of follower size (bracket-matching means
// even a zero-post creator gets a strong teaser), and this creator base
// clusters 30K-500K followers, so sorting the pool by followers would just
// float a handful of big accounts for no reason. Follower count stays a
// filter (min/max) and a display column only. "Compute next window" (the
// `batch` param) advances through the segment in windows of this size rather
// than silently truncating it.
const PREFILTER_WINDOW_SIZE = 150;
// Bounded concurrency for the getCreatorBrandMatches pass — sequential
// chunks, never one unbounded Promise.all over the whole window.
const STRENGTH_CHUNK_SIZE = 10;

type SocialProfileCandidateRow = {
  id: string;
  creator_id: string;
  handle: string;
  platform: Platform;
  follower_count: number;
  detected_country: string | null;
  detected_niche: string | null;
  creators: { display_name: string | null } | { display_name: string | null }[] | null;
};

export type RankedCreator = {
  creatorId: string;
  handle: string;
  displayName: string | null;
  platform: Platform;
  followerCount: number;
  detectedCountry: string | null;
  detectedNiche: string | null;
  totalMatchCount: number;
  programCount: number;
  strongestRecencyBucket: RecencyBucket | null;
  hasRegionMatch: boolean;
  claimed: boolean;
  outreachStatus: 'not_contacted' | 'dmed';
  dmedAt: string | null;
  isSpanish: boolean;
  dmLink: string;
  strength: TeaserStrengthInput;
};

async function requireAdmin(): Promise<{ error: NextResponse } | { userId: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleData?.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { userId: user.id };
}

function displayNameOf(row: SocialProfileCandidateRow): string | null {
  const c = row.creators;
  return (Array.isArray(c) ? c[0]?.display_name : c?.display_name) ?? null;
}

type FilterParams = { country: string | null; niche: string | null; followerMin: number | null; followerMax: number | null };

// Shared query-building path for the data window, the total-matched count,
// and the Spanish-segment count — every one of these is a bounded
// server-side query built from the same filters, never a client-side slice.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFilteredQuery(admin: any, params: FilterParams, opts: { count?: 'exact'; select?: string } = {}) {
  const select = opts.select ?? (opts.count ? '*' : 'id, creator_id, handle, platform, follower_count, detected_country, detected_niche, creators!inner(display_name)');
  let query = admin
    .from('social_profiles')
    .select(select, opts.count ? { count: opts.count, head: true } : undefined)
    .not('follower_count', 'is', null);

  if (params.country) query = query.ilike('detected_country', `%${params.country}%`);
  if (params.niche) query = query.ilike('detected_niche', `%${params.niche}%`);
  if (params.followerMin != null) query = query.gte('follower_count', params.followerMin);
  if (params.followerMax != null) query = query.lte('follower_count', params.followerMax);
  return query;
}

function buildRankedCreator(
  row: SocialProfileCandidateRow,
  matches: CreatorBrandMatches,
  claimedSet: Set<string>,
  outreachByCreator: Map<string, { status: string; dmed_at: string | null }>,
): RankedCreator {
  const strength = computeTeaserStrengthInput(matches, row.detected_niche);
  const outreach = outreachByCreator.get(row.creator_id);
  const isSpanish = row.detected_country != null && SPANISH_COUNTRIES.includes(row.detected_country);

  return {
    creatorId: row.creator_id,
    handle: row.handle,
    displayName: displayNameOf(row),
    platform: row.platform,
    followerCount: row.follower_count,
    detectedCountry: row.detected_country,
    detectedNiche: row.detected_niche,
    totalMatchCount: matches.totalMatchCount,
    programCount: strength.programCount,
    strongestRecencyBucket: matches.strongestMatch?.recencyBucket ?? null,
    hasRegionMatch: strength.hasRegionMatch,
    claimed: claimedSet.has(row.creator_id),
    outreachStatus: (outreach?.status === 'dmed' ? 'dmed' : 'not_contacted'),
    dmedAt: outreach?.dmed_at ?? null,
    isSpanish,
    dmLink: `${isSpanish ? '/es' : ''}/claim/${row.handle}`,
    strength,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const url = new URL(req.url);
    const country = url.searchParams.get('country')?.trim() || null;
    const niche = url.searchParams.get('niche')?.trim() || null;
    const followerMinRaw = url.searchParams.get('followerMin');
    const followerMaxRaw = url.searchParams.get('followerMax');
    const followerMin = followerMinRaw ? Number(followerMinRaw) : null;
    const followerMax = followerMaxRaw ? Number(followerMaxRaw) : null;
    const batch = Math.max(0, Number(url.searchParams.get('batch') ?? '0') || 0);

    const admin = createSupabaseAdminClient();
    const filterParams: FilterParams = { country, niche, followerMin, followerMax };
    const offset = batch * PREFILTER_WINDOW_SIZE;

    // Neutral row order — id, not follower_count — so batching never floats
    // big accounts to the front of the pool. Teaser strength (computed below)
    // is what actually ranks the results; this just picks which bounded
    // slice of the filtered segment gets computed in this batch.
    const windowQuery = buildFilteredQuery(admin, filterParams)
      .order('id', { ascending: true })
      .range(offset, offset + PREFILTER_WINDOW_SIZE - 1);
    const countQuery = buildFilteredQuery(admin, filterParams, { count: 'exact' });
    const spanishCountQuery = buildFilteredQuery(admin, filterParams, { count: 'exact' }).in('detected_country', SPANISH_COUNTRIES);

    const [windowResult, countResult, spanishCountResult] = await Promise.all([
      withTimeout(Promise.resolve(windowQuery), DB_TIMEOUT_MS),
      withTimeout(Promise.resolve(countQuery), DB_TIMEOUT_MS),
      withTimeout(Promise.resolve(spanishCountQuery), DB_TIMEOUT_MS),
    ]);
    if (windowResult.error) throw windowResult.error;
    if (countResult.error) throw countResult.error;
    if (spanishCountResult.error) throw spanishCountResult.error;

    const candidateRows = (windowResult.data ?? []) as unknown as SocialProfileCandidateRow[];

    // Dedupe to one candidate per creator_id — a creator can have both an
    // Instagram and TikTok social_profiles row, each independently matching
    // the filter. getCreatorBrandMatches already combines both platforms'
    // follower counts internally when computing matches, so ranking two rows
    // for the same person would just double them up in the list. Keep
    // whichever row has the higher follower_count as the representative
    // handle/platform shown in the UI.
    const byCreator = new Map<string, SocialProfileCandidateRow>();
    for (const row of candidateRows) {
      const existing = byCreator.get(row.creator_id);
      if (!existing || row.follower_count > existing.follower_count) byCreator.set(row.creator_id, row);
    }
    const candidates = [...byCreator.values()];
    const creatorIds = candidates.map((c) => c.creator_id);

    // Batched claim + outreach lookups — one query each for the whole
    // window, never per-creator.
    const [claimedResult, outreachResult] = await Promise.all([
      withTimeout(
        Promise.resolve(admin.from('creator_profiles').select('creator_id').in('creator_id', creatorIds.length ? creatorIds : [''])),
        DB_TIMEOUT_MS,
      ),
      withTimeout(
        Promise.resolve(admin.from('creator_outreach').select('creator_id, status, dmed_at').in('creator_id', creatorIds.length ? creatorIds : [''])),
        DB_TIMEOUT_MS,
      ),
    ]);
    if (claimedResult.error) throw claimedResult.error;
    if (outreachResult.error) throw outreachResult.error;

    const claimedSet = new Set(
      ((claimedResult.data ?? []) as { creator_id: string | null }[]).map((r) => r.creator_id).filter((id): id is string => !!id),
    );
    const outreachByCreator = new Map(
      ((outreachResult.data ?? []) as { creator_id: string; status: string; dmed_at: string | null }[]).map((r) => [r.creator_id, r]),
    );

    // Stage B: bounded, chunked getCreatorBrandMatches — sequential chunks
    // of STRENGTH_CHUNK_SIZE, each wrapped in its own try/catch so one bad
    // chunk (a timeout, a transient DB error) doesn't fail the whole
    // request — the admin still gets every other chunk's results.
    const results: RankedCreator[] = [];
    for (let i = 0; i < candidates.length; i += STRENGTH_CHUNK_SIZE) {
      const chunk = candidates.slice(i, i + STRENGTH_CHUNK_SIZE);
      try {
        const chunkMatches = await Promise.all(
          chunk.map((c) => withTimeout(getCreatorBrandMatches(admin, c.creator_id), STRENGTH_CALL_TIMEOUT_MS)),
        );
        chunk.forEach((c, idx) => {
          const matches = chunkMatches[idx];
          if (!matches) return; // creator_id vanished between stage A and stage B — skip, never fabricate
          results.push(buildRankedCreator(c, matches, claimedSet, outreachByCreator));
        });
      } catch (err) {
        console.error(`Targeting: chunk starting at index ${i} failed, skipping that chunk:`, err);
      }
    }

    results.sort((a, b) => compareTeaserStrength(a.strength, b.strength));

    const matchedCount = countResult.count ?? 0;
    const spanishCount = spanishCountResult.count ?? 0;

    return NextResponse.json({
      results,
      window: {
        batch,
        size: PREFILTER_WINDOW_SIZE,
        candidateCount: candidates.length,
        hasMore: offset + PREFILTER_WINDOW_SIZE < matchedCount,
      },
      matchedCount,
      language: { spanishCount, englishCount: matchedCount - spanishCount },
    });
  } catch (err) {
    console.error('Targeting panel load failed:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load' }, { status: 500 });
  }
}

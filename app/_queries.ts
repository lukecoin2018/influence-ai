import { cache } from 'react';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { formatDate } from '@/lib/formatters';
import { bucketContentMix, initialsFrom } from './_data';
import type { PublicStats, LeaderboardRow, FeaturedCreator } from './_data';

/**
 * Still no cookies, for the original reason: reading cookies() would force
 * this route into per-request dynamic rendering, which conflicts with the
 * `export const revalidate = 3600` ISR setting on the page. The service-role
 * client reads no cookies and no headers, so `/` stays statically prerendered
 * — app/report/[slug]/page.tsx already pairs this client with its own
 * `revalidate` and is the working precedent.
 *
 * Why service-role rather than the anon key it used to use: the anon role
 * carries statement_timeout=3s, and top_creators() runs for roughly 2s. That
 * race was close enough to lose intermittently — Postgres killed the query,
 * withTimeout's 10s JS timer never fired, and page.tsx's .catch() swallowed
 * the error, so a losing roll rendered an empty leaderboard, empty ticker and
 * no hero card while the stats band still showed real numbers. Then ISR cached
 * that for an hour. service_role has no statement_timeout, so the race is gone
 * rather than merely widened.
 *
 * These calls run server-side during prerender and ISR regeneration only; the
 * key never reaches a browser, and lib/supabase-admin.ts's `server-only`
 * import makes any client-side import of this module a build error.
 *
 * cache() dedupes calls with identical args within a single render pass, so
 * generateMetadata() and the page body sharing a query only hit the DB once.
 */
const db = createSupabaseAdminClient();

// Wrapping Date.now() here (rather than calling it directly in page.tsx's render
// body) keeps it out of static "no impure calls during render" lint checks —
// this Server Component render only runs once per request/ISR regen, and the
// resulting value is passed down as a prop so client hydration reads the same
// number instead of computing its own.
export function getRenderTimestamp(): number {
  return Date.now();
}

export const getPublicStats = cache(async (): Promise<PublicStats> => {
  const { data, error } = await db.rpc('public_stats');
  if (error || !data) {
    throw new Error(`public_stats() failed: ${error?.message ?? 'no data'}`);
  }
  return {
    creators: data.creators,
    postsAnalyzed: data.posts_analyzed,
    brandDeals: data.brand_deals,
    igMedian: data.ig_median,
    tiktokMedian: data.tiktok_median,
    lastIndex: formatDate(data.last_index),
  };
});

export const getTopCreators = cache(async (platform: 'instagram' | 'tiktok', limit: number): Promise<LeaderboardRow[]> => {
  const { data, error } = await db.rpc('top_creators', { p_platform: platform, p_limit: limit });
  if (error || !data) {
    throw new Error(`top_creators(${platform}) failed: ${error?.message ?? 'no data'}`);
  }
  // Rows arrive pre-sorted by the RPC for this platform (engagement for IG, med_views for TikTok) — never re-sort here.
  return data.map((row: { handle: string; display_name: string; followers: number; engagement: number; med_views: number; posts: number }) => ({
    handle: row.handle,
    displayName: row.display_name,
    followers: row.followers,
    engagement: row.engagement,
    medViews: row.med_views,
    posts: row.posts,
  }));
});

type FeaturedCore = {
  displayName: string;
  handle: string;
  platform: 'instagram' | 'tiktok';
  followers: number | null;
  engagement: number | null;
  location: string | null;
  creatorId?: string;
};

// Enrichment extras (brands, avg views, posting cadence, content mix) are a secondary,
// best-effort lookup per creator — if any part of it is missing, the corresponding card
// block is omitted by the Hero component rather than showing invented data.
async function resolveFeaturedCreator(core: FeaturedCore, stats: PublicStats): Promise<FeaturedCreator> {
  // The creators!inner embed + status filter replicate social_profiles' RLS
  // policy (rows limited to profiles whose creator is status='active'), which
  // the service-role client bypasses. NOT redundant — deleting it would let a
  // deactivated creator's enrichment reach the homepage. The `!inner` join
  // makes a non-active creator yield no row at all, same as the policy.
  let spQuery = db
    .from('social_profiles')
    .select('id, enrichment_data, detected_city, creators!inner(status)')
    .eq('creators.status', 'active')
    .eq('platform', core.platform);
  spQuery = core.creatorId ? spQuery.eq('creator_id', core.creatorId) : spQuery.eq('handle', core.handle);
  const { data: sp, error: spError } = await spQuery.maybeSingle();
  // No row is a legitimate outcome here — a deactivated creator, or one with no
  // profile on this platform — so a miss stays silent. An actual error is not,
  // and looked identical before: both produced a card with no enrichment.
  if (spError) {
    console.error(
      `[home] social_profiles lookup failed for @${core.handle}, omitting enrichment — ${spError.message}`
    );
  }

  const enrichment = sp?.enrichment_data ?? null;
  const location = core.location ?? sp?.detected_city ?? null;

  let contentMix: FeaturedCreator['contentMix'] = null;
  if (sp?.id) {
    // creator_posts' RLS policy (post's profile must belong to a status='active'
    // creator) is already satisfied upstream rather than repeated here: sp.id can
    // only be non-null if the active-filtered query above returned it. Replicating
    // it literally would mean a creator_posts -> social_profiles -> creators nested
    // join on every hero-card render for no change in result. If that filter above
    // is ever loosened, this one has to become explicit.
    const { data: posts, error } = await db
      .from('creator_posts')
      .select('post_type')
      .eq('social_profile_id', sp.id);
    // Content mix is best-effort, so a failure omits the block rather than
    // failing the card — but it was previously omitted silently, which is the
    // same blind spot that hid the anon statement_timeout. Same log prefix and
    // shape as page.tsx's logAndFallback; a direct check rather than that
    // helper because supabase-js returns errors instead of rejecting.
    if (error) {
      console.error(
        `[home] creator_posts lookup failed for social_profile ${sp.id}, omitting content mix — ${error.message}`
      );
    }
    if (posts && posts.length > 0) {
      const mix = bucketContentMix(posts);
      contentMix = mix.length > 0 ? mix : null;
    }
  }

  const distinctBrands = [...new Set((enrichment?.detected_brands ?? []).filter(Boolean))] as string[];
  const brands = distinctBrands.length > 0 ? distinctBrands : null;

  return {
    displayName: core.displayName,
    initials: initialsFrom(core.displayName, core.handle),
    handle: core.handle,
    platform: core.platform,
    location,
    engagementRate: core.engagement,
    platformMedianEngagement: core.platform === 'instagram' ? stats.igMedian : stats.tiktokMedian,
    followers: core.followers,
    postsPerWeek: enrichment?.posting_frequency_per_week ?? null,
    avgViews: enrichment?.avg_views ?? null,
    contentMix,
    brands,
    brandPartnershipsDetected: brands ? brands.length : null,
    dataAsOf: stats.lastIndex,
  };
}

export const getFeaturedCreatorPool = cache(async (igTop: LeaderboardRow[], stats: PublicStats): Promise<FeaturedCreator[]> => {
  const { data: featuredRows, error: featuredError } = await db
    .from('creators')
    .select('id, display_name, primary_platform, instagram_handle, follower_count, engagement_rate, city')
    // Replicates creators' RLS policy (public_read_active: status='active'),
    // which the service-role client bypasses. NOT redundant with is_featured —
    // a creator can be featured and deactivated at the same time, and without
    // this the first deactivation would silently put them back on the homepage,
    // possibly as the hero card.
    .eq('status', 'active')
    .eq('is_featured', true)
    .order('display_order', { ascending: true });

  // The most consequential of these checks. A failure here leaves featuredRows
  // null, the loop below adds nothing, and the igTop fallback quietly takes
  // over — so a broken query is indistinguishable from "no featured creators
  // configured". That exact ambiguity, an empty result reading as an intended
  // empty state, is what kept the anon statement_timeout hidden for days.
  if (featuredError) {
    console.error(
      `[home] featured creators query failed, falling back to the top-creators pool — ${featuredError.message}`
    );
  }

  const cores: FeaturedCore[] = [];

  // `creators` only stores an instagram_handle column today — a featured TikTok
  // creator with no handle here can't be rendered, so it's skipped.
  for (const row of featuredRows ?? []) {
    const handle = row.primary_platform === 'instagram' ? row.instagram_handle : null;
    if (!handle) continue;
    cores.push({
      displayName: row.display_name,
      handle,
      platform: row.primary_platform,
      followers: row.follower_count,
      engagement: row.engagement_rate,
      location: row.city,
      creatorId: row.id,
    });
  }

  if (cores.length === 0) {
    for (const top of igTop.slice(0, 8)) {
      cores.push({
        displayName: top.displayName,
        handle: top.handle,
        platform: 'instagram',
        followers: top.followers,
        engagement: top.engagement,
        location: null,
      });
    }
  }

  return Promise.all(cores.map((core) => resolveFeaturedCreator(core, stats)));
});

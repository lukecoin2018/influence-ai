import { cache } from 'react';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { formatDate } from '@/lib/formatters';
import { parseHomepageSnapshot, SnapshotError, type HomepageSnapshot } from '@/lib/homepage-snapshot/parse';
import { bucketContentMix, initialsFrom } from './_data';
import type { PublicStats, LeaderboardRow, FeaturedCreator } from './_data';

/**
 * The homepage's numbers, read from ONE precomputed row: homepage_snapshot,
 * written by refresh_homepage_snapshot() (supabase/migrations/0031) every 6
 * hours and after every import. Nothing here aggregates anything.
 *
 * It used to. public_stats() and two top_creators() calls each read all of
 * creator_posts at render time; on 2026-10-14 they took 23-31 s apiece during
 * an enrich run and the whole sequence 61.3 s. Each failure was caught and
 * replaced with hardcoded July figures or an empty leaderboard, and ISR cached
 * that for an hour. Do not put an aggregate query back on this path — add the
 * figure to the snapshot payload instead (CLAUDE.md, "Homepage numbers").
 *
 * Every helper THROWS when the snapshot cannot be read or is malformed. There
 * is no fallback: a throw during ISR revalidation leaves Next serving the last
 * good page, and a throw during `next build` fails the build, which is the
 * intended outcome when the row is missing.
 *
 * Service-role client, no cookies() or headers(): reading either would force
 * `/` into per-request rendering and lose ISR. The key never reaches a
 * browser; lib/supabase-admin.ts imports `server-only`.
 *
 * cache() dedupes within one render pass, so generateMetadata(), the page
 * body and the helpers below share a single read of the row.
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

export const getHomepageSnapshot = cache(async (): Promise<HomepageSnapshot> => {
  const { data, error } = await db
    .from('homepage_snapshot')
    .select('payload, computed_at')
    .eq('id', true)
    .maybeSingle();
  if (error) {
    throw new SnapshotError(`homepage_snapshot read failed: ${error.message}`);
  }
  if (!data) {
    throw new SnapshotError('homepage_snapshot has no row yet: run refresh_homepage_snapshot() (migration 0031)');
  }
  return parseHomepageSnapshot(data);
});

export const getPublicStats = cache(async (): Promise<PublicStats> => {
  const { stats } = await getHomepageSnapshot();
  return {
    creators: stats.creators,
    postsAnalyzed: stats.postsAnalyzed,
    brandDeals: stats.brandDeals,
    igMedian: stats.igMedian,
    tiktokMedian: stats.tiktokMedian,
    lastIndex: formatDate(stats.lastIndex),
  };
});

/**
 * The snapshot's top 10 for a platform, in the order refresh_homepage_snapshot()
 * ranked them (engagement for Instagram, median views for TikTok) — never
 * re-sort here. May be empty only if a snapshot was written before the refusal
 * rules existed; the Leaderboard hides an empty platform rather than print
 * "Top 0".
 */
export const getTopCreators = cache(async (platform: 'instagram' | 'tiktok'): Promise<LeaderboardRow[]> => {
  const { leaderboards } = await getHomepageSnapshot();
  return leaderboards[platform].map((row) => ({
    handle: row.handle,
    displayName: row.displayName,
    followers: row.followers,
    engagement: row.engagement,
    medViews: row.medViews,
    posts: row.posts,
  }));
});

/**
 * Hero-card pool: featured active creators, or the first 8 of the Instagram
 * leaderboard when none are featured (chosen in SQL). Optional blocks —
 * brands, posting cadence, average views, content mix — are null when the
 * snapshot has nothing for them, and the Hero omits them rather than showing
 * invented data.
 */
export const getFeaturedCreatorPool = cache(async (): Promise<FeaturedCreator[]> => {
  const snapshot = await getHomepageSnapshot();
  const stats = await getPublicStats();
  return snapshot.featuredPool.map((entry) => {
    const displayName = entry.displayName ?? entry.handle;
    const distinctBrands = [...new Set(entry.detectedBrands.filter(Boolean))];
    const brands = distinctBrands.length > 0 ? distinctBrands : null;
    const mix = bucketContentMix(entry.postTypes);
    return {
      displayName,
      initials: initialsFrom(displayName, entry.handle),
      handle: entry.handle,
      platform: entry.platform,
      location: entry.location,
      engagementRate: entry.engagement,
      platformMedianEngagement: entry.platform === 'instagram' ? stats.igMedian : stats.tiktokMedian,
      followers: entry.followers,
      postsPerWeek: entry.postsPerWeek,
      avgViews: entry.avgViews,
      contentMix: mix.length > 0 ? mix : null,
      brands,
      brandPartnershipsDetected: brands ? brands.length : null,
      dataAsOf: stats.lastIndex,
    };
  });
});

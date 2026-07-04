import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/formatters';
import { bucketContentMix, initialsFrom } from './_data';
import type { PublicStats, LeaderboardRow, FeaturedCreator } from './_data';

/**
 * Uses lib/supabase.ts (anon-key client, no cookies) rather than
 * lib/supabase-server.ts's cookie-aware client: reading cookies() would force
 * this route into per-request dynamic rendering, which conflicts with the
 * `export const revalidate = 3600` ISR setting on the page. All reads here are
 * public, unauthenticated data (same pattern the original app/page.tsx uses).
 *
 * cache() dedupes calls with identical args within a single render pass, so
 * generateMetadata() and the page body sharing a query only hit the DB once.
 */

// Wrapping Date.now() here (rather than calling it directly in page.tsx's render
// body) keeps it out of static "no impure calls during render" lint checks —
// this Server Component render only runs once per request/ISR regen, and the
// resulting value is passed down as a prop so client hydration reads the same
// number instead of computing its own.
export function getRenderTimestamp(): number {
  return Date.now();
}

export const getPublicStats = cache(async (): Promise<PublicStats> => {
  const { data, error } = await supabase.rpc('public_stats');
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
  const { data, error } = await supabase.rpc('top_creators', { p_platform: platform, p_limit: limit });
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
  let spQuery = supabase.from('social_profiles').select('id, enrichment_data, detected_city').eq('platform', core.platform);
  spQuery = core.creatorId ? spQuery.eq('creator_id', core.creatorId) : spQuery.eq('handle', core.handle);
  const { data: sp } = await spQuery.maybeSingle();

  const enrichment = sp?.enrichment_data ?? null;
  const location = core.location ?? sp?.detected_city ?? null;

  let contentMix: FeaturedCreator['contentMix'] = null;
  if (sp?.id) {
    const { data: posts } = await supabase.from('creator_posts').select('post_type').eq('social_profile_id', sp.id);
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
  const { data: featuredRows } = await supabase
    .from('creators')
    .select('id, display_name, primary_platform, instagram_handle, follower_count, engagement_rate, city')
    .eq('is_featured', true)
    .order('display_order', { ascending: true });

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

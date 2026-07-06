/**
 * Replicates top_creators()'s engagement methodology (verified against its live output:
 * median((likes+comments)/followers*100) across a creator's posts matches the RPC's
 * `engagement` value for well-behaved creators). The raw social_profiles.engagement_rate
 * column has no such floor/cap and can be wildly wrong for a creator with few posts and
 * one viral outlier (observed: 174.6%, 99.5% on /report/[slug]'s Tier 3) — never display
 * or rank by that column, anywhere on the report (Tier 1, Tier 2, or Tier 3). A creator
 * with fewer than MIN_POSTS posts can't be scored at all and must be excluded rather than
 * falling back to the raw column.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const MIN_POSTS = 8;
const CAPS: Record<'instagram' | 'tiktok', number> = { instagram: 20, tiktok: 40 };

export type EngagementPost = {
  likes_count: number | null;
  comments_count: number | null;
};

/** Returns the capped median per-post engagement rate, or null if there isn't enough post history to score. */
export function computeMedianEngagement(
  posts: EngagementPost[],
  followerCount: number | null,
  platform: 'instagram' | 'tiktok',
): number | null {
  if (!followerCount || posts.length < MIN_POSTS) return null;

  const values = posts
    .map((p) => ((p.likes_count ?? 0) + (p.comments_count ?? 0)) / followerCount * 100)
    .sort((a, b) => a - b);

  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];

  return Math.min(median, CAPS[platform]);
}

export type ScorableProfile = {
  profileId: string;
  followerCount: number | null;
  platform: 'instagram' | 'tiktok';
};

/**
 * Batch version of computeMedianEngagement() — one creator_posts query for every profile
 * (using ALL of a profile's posts, not just posts tied to any one brand), rather than a
 * query per profile. Profiles that can't be scored (fewer than MIN_POSTS posts) are
 * simply absent from the returned map — callers must treat "missing" as "don't display
 * a number", never fall back to the raw engagement_rate column.
 */
export async function scoreProfilesByMedianEngagement(
  supabase: SupabaseClient,
  profiles: ScorableProfile[],
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  if (profiles.length === 0) return scores;

  const { data: posts } = await supabase
    .from('creator_posts')
    .select('social_profile_id, likes_count, comments_count')
    .in('social_profile_id', profiles.map((p) => p.profileId));

  const postsByProfile = new Map<string, EngagementPost[]>();
  for (const p of posts ?? []) {
    const list = postsByProfile.get(p.social_profile_id) ?? [];
    list.push({ likes_count: p.likes_count, comments_count: p.comments_count });
    postsByProfile.set(p.social_profile_id, list);
  }

  for (const profile of profiles) {
    const score = computeMedianEngagement(postsByProfile.get(profile.profileId) ?? [], profile.followerCount, profile.platform);
    if (score != null) scores.set(profile.profileId, score);
  }

  return scores;
}

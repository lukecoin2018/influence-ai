/**
 * Replicates top_creators()'s engagement methodology (verified against its live output:
 * median((likes+comments)/followers*100) across a creator's posts matches the RPC's
 * `engagement` value for well-behaved creators). The raw social_profiles.engagement_rate
 * column has no such floor/cap and can be wildly wrong for a creator with few posts and
 * one viral outlier (observed: 174.6%, 99.5% on /report/[slug]'s Tier 3) — never display
 * or rank by that column. A creator with fewer than MIN_POSTS posts can't be scored at
 * all and must be excluded rather than falling back to the raw column.
 */

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

/**
 * Types + pure helpers for /home-v2. All data fetching lives in ./_queries.ts —
 * this file only holds shapes and functions with no I/O.
 */

const HOUR_MS = 1000 * 60 * 60;

/**
 * Deterministic pool index from a timestamp — same input always gives the same
 * output on server and client, so this must be fed a timestamp captured once
 * (as a prop), never a fresh Date.now()/Math.random() call made independently
 * on each side, or server and client would pick different creators and hydration
 * would mismatch.
 */
export function indexForTimestamp(timestampMs: number, poolLength: number): number {
  if (poolLength <= 0) return 0;
  const hourIndex = Math.floor(timestampMs / HOUR_MS);
  return hourIndex % poolLength;
}

export type PublicStats = {
  creators: number;
  postsAnalyzed: number;
  brandDeals: number;
  igMedian: number;
  tiktokMedian: number;
  /** Formatted for display, e.g. "Jul 3, 2026" */
  lastIndex: string;
};

export type LeaderboardRow = {
  handle: string;
  displayName: string;
  followers: number;
  engagement: number;
  /** Median views per post — TikTok tab ranking metric */
  medViews: number;
  posts: number;
};

export type ContentMixColor = 'yellow' | 'ink' | 'gray';

export type ContentMixSlice = {
  label: string;
  pct: number;
  color: ContentMixColor;
};

export type FeaturedCreator = {
  displayName: string;
  initials: string;
  handle: string;
  platform: 'instagram' | 'tiktok';
  location: string | null;
  engagementRate: number | null;
  /** ig_median or tiktok_median, matched to this creator's platform */
  platformMedianEngagement: number | null;
  followers: number | null;
  postsPerWeek: number | null;
  avgViews: number | null;
  /** null/empty when creator_posts has no rows for this profile — omit the block */
  contentMix: ContentMixSlice[] | null;
  /** null/empty when no detected brands — omit the block */
  brands: string[] | null;
  brandPartnershipsDetected: number | null;
  dataAsOf: string;
};

const LETTER_OR_DIGIT = /\p{L}|\p{N}/u;

/**
 * Code-point-safe initials: splitting on raw string indices breaks surrogate
 * pairs (emoji, etc.), which renders differently between server and client
 * ICU/segmentation and causes hydration mismatches. Array.from() splits on
 * whole code points instead, and the Unicode-aware regex strips punctuation
 * and symbols before we take a letter/digit from each word.
 */
export function initialsFrom(name: string, handle?: string): string {
  const words = (name ?? '')
    .split(/\s+/)
    .map((word) => Array.from(word).filter((ch) => LETTER_OR_DIGIT.test(ch)))
    .filter((chars) => chars.length > 0);

  const initials = words
    .slice(0, 2)
    .map((chars) => chars[0].toUpperCase())
    .join('');

  if (initials) return initials;

  const handleChar = handle ? Array.from(handle).find((ch) => LETTER_OR_DIGIT.test(ch)) : undefined;
  return handleChar ? handleChar.toUpperCase() : '?';
}

type PostTypeBucket = 'video' | 'carousel' | 'photo' | 'other';

function classifyPostType(rawType: string | null): PostTypeBucket {
  const t = (rawType ?? '').toLowerCase();
  if (t.includes('video') || t.includes('reel')) return 'video';
  if (t.includes('sidecar') || t.includes('carousel')) return 'carousel';
  if (t.includes('image') || t.includes('photo')) return 'photo';
  return 'other';
}

const BUCKET_ORDER: { bucket: PostTypeBucket; label: string; color: ContentMixColor }[] = [
  { bucket: 'video', label: 'Video', color: 'yellow' },
  { bucket: 'carousel', label: 'Carousel', color: 'ink' },
  { bucket: 'photo', label: 'Photo', color: 'gray' },
  { bucket: 'other', label: 'Other', color: 'gray' },
];

/** Buckets creator_posts.post_type rows into a content-mix distribution. Empty input -> empty output (caller omits the block). */
export function bucketContentMix(posts: { post_type: string | null }[]): ContentMixSlice[] {
  if (posts.length === 0) return [];
  const counts: Record<PostTypeBucket, number> = { video: 0, carousel: 0, photo: 0, other: 0 };
  for (const p of posts) counts[classifyPostType(p.post_type)]++;
  const total = posts.length;
  return BUCKET_ORDER.filter((o) => counts[o.bucket] > 0).map((o) => ({
    label: o.label,
    pct: Math.round((counts[o.bucket] / total) * 100),
    color: o.color,
  }));
}

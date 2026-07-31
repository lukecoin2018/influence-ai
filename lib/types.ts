export interface Creator {
  creator_id: string;
  name: string;
  status: string;
  is_featured: boolean;
  total_followers: number;
  primary_platform: 'instagram' | 'tiktok';
  // Instagram
  instagram_handle: string | null;
  instagram_followers: number | null;
  instagram_engagement: number | null;
  instagram_verified: boolean | null;
  instagram_pic: string | null;
  // TikTok
  tiktok_handle: string | null;
  tiktok_followers: number | null;
  tiktok_engagement: number | null;
  tiktok_verified: boolean | null;
  tiktok_pic: string | null;
  
  // Intelligence fields
  city: string | null;
  country: string | null;
  primary_language: string | null;
  contact_email: string | null;
  ai_summary: string | null;
}

export interface SocialProfile {
  id: string;
  creator_id: string;
  platform: 'instagram' | 'tiktok';
  handle: string;
  follower_count: number | null;
  following_count: number | null;
  posts_count: number | null;
  engagement_rate: number | null;
  is_verified: boolean;
  profile_pic_url: string | null;
  profile_url: string | null;
  bio: string | null;
  website: string | null;
  platform_data: Record<string, any>;
  discovered_via_hashtags: string[] | null;
  enrichment_data: EnrichmentData | null;
  enriched_at: string | null;
  /**
   * Read by app/creators/[handle]/page.tsx (the profile-level summary is
   * derived from whichever social profile has one) and selected by the discover
   * tree and lib/reports/matching.ts. It was always a column on this table and
   * always read off these rows; it was simply never declared here, because
   * select('*') handed the callers an untyped row.
   */
  ai_summary: string | null;
}

/**
 * The social_profiles columns the two anon-key public reads may select, as one
 * PostgREST select string.
 *
 * Exists because those two reads used `select('*')`, and `*` is why the anon
 * grant on this table cannot be narrowed: Postgres expands it to every column
 * before checking privileges, so a role missing SELECT on one column is refused
 * the entire query. Two attempts to column-scope the grant took the public
 * pages down for exactly this reason — including one that excluded only
 * detected_email.
 *
 * The list is exactly the SocialProfile interface above, so the two stay in
 * lockstep. It deliberately omits detected_email — scraped creator contact
 * addresses, which neither public surface displays and which `*` was shipping
 * to every visitor.
 *
 * Adding a column here widens what anonymous visitors can read. Adding one to
 * the table does not, which is the direction that should be hard to get wrong.
 */
export const SOCIAL_PROFILE_PUBLIC_COLUMNS =
  'id, creator_id, platform, handle, follower_count, following_count, posts_count, ' +
  'engagement_rate, is_verified, profile_pic_url, profile_url, bio, website, ' +
  'platform_data, discovered_via_hashtags, enrichment_data, enriched_at, ai_summary';

export interface CreatorDetail extends Creator {
  social_profiles: SocialProfile[];
  claimed_profile?: any | null;
}

export interface CreatorListResponse {
  creators: Creator[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StatsResponse {
  totalCreators: number;
  avgEngagementRate: number;
  categoryCount: number;
  platformBreakdown: {
    instagram: number;
    tiktok: number;
    both: number;
  };
}

export interface CreatorFilters {
  search?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  category?: string;
  platform?: 'instagram' | 'tiktok' | 'both';
  verified?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  language?: string;
  country?: string;
  hasEmail?: boolean;
}

export interface EnrichmentData {
  avg_likes: number | null;
  avg_views: number | null;
  avg_comments: number | null;
  content_mix: Record<string, number> | null;
  top_hashtags: string[] | null;
  last_post_date: string | null;
  days_since_last_post: number | null;
  sponsored_posts_count: number | null;
  detected_brands: string[] | null;
  brand_partnership_count: number | null;
  calculated_engagement_rate: number | null;
  posting_frequency_per_week: number | null;
}

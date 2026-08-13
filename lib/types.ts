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

/* ── TEASER PROJECTIONS ────────────────────────────────────────────────────
 *
 * What an ANONYMOUS visitor may read on /creators/[handle] and from
 * /api/creators/[handle]. Both surfaces import these three constants so the
 * page and its API twin cannot drift apart — gating one and not the other
 * changes nothing, because a scraper reads the JSON, not the HTML.
 *
 * These are deliberately NOT derived from SOCIAL_PROFILE_PUBLIC_COLUMNS above.
 * That constant carries ai_summary, bio, enrichment_data and
 * discovered_via_hashtags — precisely the fields gated here — so reusing it as
 * a teaser basis would gate nothing. It stays as it is for the surfaces that
 * legitimately show a full public record.
 *
 * The gate is applied by SELECTing fewer columns rather than by hiding fields
 * in JSX, so a field that is gated is never fetched, never in the response
 * body, and cannot be reintroduced by a later render change.
 *
 * Narrowing only: anon holds SELECT on every column named here (the
 * unnarrowable grant described above), so these lists restrict what is asked
 * for, never what is permitted.
 */

/**
 * Drops bio (free text that carries contact addresses), ai_summary,
 * enrichment_data and enriched_at (Content Analytics, Content Mix, Top
 * Hashtags, Brand Partnerships), and discovered_via_hashtags (internal scrape
 * metadata). Keeps the follower/engagement/verified/handle/link fields the
 * public teaser and the claim entrance are built from.
 */
export const SOCIAL_PROFILE_TEASER_COLUMNS =
  'id, creator_id, platform, handle, follower_count, following_count, posts_count, ' +
  'engagement_rate, is_verified, profile_pic_url, profile_url, website, platform_data';

/**
 * Drops contact_email, notes, discovery_count, first_discovered_at,
 * discovered_via_hashtags and the embedding columns. The page reads almost
 * everything it displays from v_creator_summary rather than from here, so this
 * list is narrow by design; widen it only for a field that is actually shown.
 */
export const CREATOR_TEASER_COLUMNS =
  'id, instagram_handle, full_name, display_name, primary_platform, total_followers, ' +
  'primary_language, country, city, status, is_featured, category_name, ' +
  'profile_pic_url, profile_url, website, last_updated_at';

/**
 * v_creator_summary is the widest of the three and the easiest to miss: it
 * carries instagram_ai_summary, tiktok_ai_summary, instagram_bio, tiktok_bio,
 * instagram_enrichment, tiktok_enrichment and contact_email. The page spreads
 * this view over the creator record, so a `select('*')` here reintroduces every
 * gated field even when social_profiles has been correctly narrowed.
 */
export const CREATOR_SUMMARY_TEASER_COLUMNS =
  'creator_id, name, status, is_featured, total_followers, primary_platform, ' +
  'display_order, content_tags, primary_language, country, city, ' +
  'instagram_handle, instagram_followers, instagram_engagement, instagram_verified, instagram_pic, ' +
  'tiktok_handle, tiktok_followers, tiktok_engagement, tiktok_verified, tiktok_pic';

/**
 * Similar Creators renders name, follower count, engagement and a handle to
 * link on — nothing else. Narrow regardless of session: this block is the
 * crawl frontier, and there is no reason for six other creators' bios and
 * summaries to be fetched to draw six cards.
 */
export const SIMILAR_CREATOR_COLUMNS =
  'creator_id, name, total_followers, instagram_handle, tiktok_handle, ' +
  'instagram_engagement, tiktok_engagement';

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

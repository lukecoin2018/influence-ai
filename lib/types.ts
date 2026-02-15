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
}

export interface CreatorDetail extends Creator {
  social_profiles: SocialProfile[];
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
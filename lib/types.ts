export interface Creator {
    id: string;
    instagram_handle: string;
    full_name: string | null;
    bio: string | null;
    follower_count: number | null;
    following_count: number | null;
    posts_count: number | null;
    engagement_rate: number | null;
    is_verified: boolean;
    is_business_account: boolean;
    category_name: string | null;
    profile_pic_url: string | null;
    profile_url: string | null;
    website: string | null;
    discovered_via_hashtags: string[] | null;
    discovery_count: number | null;
    status: string;
    is_featured: boolean;
    display_order: number | null;
    content_tags: string[] | null;
    first_discovered_at: string | null;
    last_updated_at: string | null;
    notes: string | null;
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
    newestCreatorDate: string | null;
  }
  
  export interface CreatorFilters {
    search?: string;
    minFollowers?: number;
    maxFollowers?: number;
    minEngagement?: number;
    category?: string;
    verified?: boolean;
    sortBy?: 'follower_count' | 'engagement_rate' | 'last_updated_at';
    sortDir?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }
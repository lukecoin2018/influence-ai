/**
 * Format a follower/following/post count to a human-readable string.
 * 125432  → "125K"
 * 1234567 → "1.2M"
 * 999     → "999"
 */
export function formatCount(n: number | null | undefined): string {
    if (n == null) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
    return n.toLocaleString();
  }
  
  /**
   * Format engagement rate as a percentage string.
   * 4.237 → "4.2%"
   */
  export function formatEngagementRate(rate: number | null | undefined): string {
    if (rate == null) return '—';
    return `${rate.toFixed(1)}%`;
  }
  
  /**
   * Return the engagement tier for a given rate.
   */
  export type EngagementTier = 'high' | 'medium' | 'low' | 'unknown';
  
  export function getEngagementTier(rate: number | null | undefined): EngagementTier {
    if (rate == null) return 'unknown';
    if (rate >= 4) return 'high';
    if (rate >= 2) return 'medium';
    return 'low';
  }
  
  /**
   * Return Tailwind-compatible CSS classes for engagement rate coloring.
   */
  export function getEngagementColors(rate: number | null | undefined): {
    text: string;
    bg: string;
  } {
    const tier = getEngagementTier(rate);
    switch (tier) {
      case 'high':
        return { text: 'text-emerald-700', bg: 'bg-emerald-50' };
      case 'medium':
        return { text: 'text-amber-700', bg: 'bg-amber-50' };
      case 'low':
        return { text: 'text-red-600', bg: 'bg-red-50' };
      default:
        return { text: 'text-gray-500', bg: 'bg-gray-100' };
    }
  }
  
  /**
   * Calculate follower/following ratio.
   * Returns formatted string like "12.4x" or "—" if data missing.
   */
  export function formatFollowerRatio(
    followers: number | null | undefined,
    following: number | null | undefined
  ): string {
    if (!followers || !following || following === 0) return '—';
    return `${(followers / following).toFixed(1)}x`;
  }
  
  /**
   * Truncate a string to maxLength characters, appending ellipsis if truncated.
   */
  export function truncate(str: string | null | undefined, maxLength: number): string {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return `${str.slice(0, maxLength).trimEnd()}…`;
  }
  
  /**
   * Clean up discovered_via_hashtags — hide technical values like
   * 'imported_from_apify', return only human-presentable hashtags.
   */
  const HIDDEN_DISCOVERY_VALUES = new Set([
    'imported_from_apify',
    'apify',
    'manual_import',
    'import',
    'csv_import',
    'bulk_import',
  ]);
  
  export function cleanDiscoveryTags(tags: string[] | null | undefined): string[] {
    if (!tags || tags.length === 0) return [];
    return tags
      .filter((tag) => !HIDDEN_DISCOVERY_VALUES.has(tag.toLowerCase().trim()))
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
  }
  
  /**
   * Format a date string to a readable format.
   * "2024-03-15T..." → "Mar 15, 2024"
   */
  export function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  
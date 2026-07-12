/**
 * Consolidates the fragmented raw `brand_brackets.category` values (32
 * distinct values observed live) into a clean set of display buckets for the
 * category pills. Approved map (founder review, 14 buckets) — recognizable
 * creator niches (Jewelry, Pet Care) are kept standalone rather than folded
 * into a bigger bucket, since the whole point of the pills is a creator
 * recognizing their own niche.
 *
 * A plain TS module rather than a DB column: changing a bucket is a one-line
 * edit + redeploy, not a data migration, and it's versioned in code like the
 * region-match / recency-bucket helpers it's modeled after.
 */

const OTHER_BUCKET = 'Other';

const RAW_TO_BUCKET: Record<string, string> = {
  Beauty: 'Beauty',

  Fashion: 'Fashion',

  Retail: 'Retail',

  'Fitness & Wellness': 'Fitness & Wellness',
  Sportswear: 'Fitness & Wellness',
  Wellness: 'Fitness & Wellness',

  Food: 'Food',
  'Food & Beverage': 'Food',

  Tech: 'Tech & Electronics',
  'Consumer Electronics': 'Tech & Electronics',

  'Home Appliances': 'Home',
  'Home & Furniture': 'Home',

  'Travel & Tourism': 'Travel & Hospitality',
  Travel: 'Travel & Hospitality',
  Hospitality: 'Travel & Hospitality',

  'Media & Entertainment': 'Entertainment',
  Entertainment: 'Entertainment',
  'Entertainment & Events': 'Entertainment',
  'Entertainment & Venues': 'Entertainment',
  Events: 'Entertainment',

  Automotive: 'Automotive',

  Spirits: 'Spirits',

  Jewelry: 'Jewelry',

  'Pet Care': 'Pet Care',

  // Genuine miscellany only — Jewelry and Pet Care are deliberately NOT here.
  Other: OTHER_BUCKET,
  Luxury: OTHER_BUCKET,
  Services: OTHER_BUCKET,
  'Shopping Center': OTHER_BUCKET,
  Crafts: OTHER_BUCKET,
  'E-commerce': OTHER_BUCKET,
  'Delivery & Services': OTHER_BUCKET,
  Insurance: OTHER_BUCKET,
};

/** Unknown/null categories (a future raw value not yet in the map, or no category at all) fall back to the same Other bucket — never a broken pill, never invented specificity. */
export function consolidateCategory(raw: string | null): string {
  if (!raw) return OTHER_BUCKET;
  return RAW_TO_BUCKET[raw] ?? OTHER_BUCKET;
}

export type CategoryCount = { name: string; count: number };

/**
 * Groups already-deduped matches (one row per distinct brand — the read
 * layer's `matches[]` is deduped by canonicalName) by consolidated bucket,
 * counting distinct brands per bucket. Sorted by count desc, then
 * alphabetically for a deterministic tie-break.
 */
export function summarizeCategories(matches: { category: string | null }[]): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const m of matches) {
    const bucket = consolidateCategory(m.category);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Maps a creator's `social_profiles.detected_niche` (content-niche vocabulary,
 * NOT `platform_data->>category_name`) to the brand bucket that should lead
 * the pills, when there's a clean equivalent. Approved map (founder review):
 * luxury/gaming/lifestyle/null deliberately have NO mapping — each was
 * checked (luxury empirically: sampling 25 real luxury-niche creators' actual
 * matches showed Beauty 278 > Fashion 218, so forcing luxury->Fashion would
 * reintroduce the exact "Beauty always leads" noise this feature removes) or
 * has no honest brand-bucket equivalent (gaming, lifestyle) or no niche at
 * all (null). All four fall back to top-by-count — the pre-existing,
 * already-correct behavior, never a fabricated lead.
 */
const NICHE_TO_BUCKET: Record<string, string> = {
  beauty: 'Beauty',
  fashion: 'Fashion',
  fitness: 'Fitness & Wellness',
  food: 'Food',
  travel: 'Travel & Hospitality',
  tech: 'Tech & Electronics',
  ecommerce: 'Retail',
};

/** Returns the bucket that should lead, or null when there's no clean equivalent (caller falls back to top-by-count). */
export function nicheLeadBucket(detectedNiche: string | null): string | null {
  if (!detectedNiche) return null;
  return NICHE_TO_BUCKET[detectedNiche] ?? null;
}

/**
 * Reorders already-summarized categories so the creator's niche bucket leads,
 * when they actually have a match in it — never fabricates a pill for a
 * bucket they have zero matches in. Otherwise returns the list unchanged
 * (top-by-count, the existing order from summarizeCategories()).
 */
export function orderCategoriesForDisplay(categories: CategoryCount[], leadBucket: string | null): CategoryCount[] {
  if (!leadBucket) return categories;
  const leadIndex = categories.findIndex((c) => c.name === leadBucket);
  if (leadIndex <= 0) return categories; // not present, or already leading — nothing to reorder
  const lead = categories[leadIndex];
  const rest = categories.filter((_, i) => i !== leadIndex);
  return [lead, ...rest];
}

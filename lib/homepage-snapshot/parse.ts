/**
 * The homepage snapshot row, validated.
 *
 * Written by refresh_homepage_snapshot() (supabase/migrations/0031); read by
 * app/_queries.ts for the homepage, its share image, the report pages and the
 * claim teaser. Pure: no I/O, so it is unit-tested and safe to import
 * anywhere.
 *
 * Every check THROWS. The pages that read this must fail rather than render
 * something invented: during ISR revalidation Next keeps serving the last
 * good page when a render throws, and at build time a throw fails the build.
 * Before the snapshot existed, a slow query fell back to hardcoded July
 * figures and an empty "Top 0" leaderboard, and ISR cached that for an hour.
 *
 * The payload is jsonb so later pages can add their own figures to the same
 * row. Fields this module does not know are ignored, not rejected.
 */

export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

export type SnapshotStats = {
  creators: number;
  postsAnalyzed: number;
  brandDeals: number;
  igMedian: number;
  tiktokMedian: number;
  /** YYYY-MM-DD: the last time a profile in the public index changed. */
  lastIndex: string;
};

export type SnapshotBoardRow = {
  handle: string;
  displayName: string;
  category: string;
  followers: number;
  engagement: number;
  medViews: number;
  posts: number;
};

export type SnapshotPoolEntry = {
  displayName: string | null;
  handle: string;
  platform: 'instagram' | 'tiktok';
  followers: number | null;
  engagement: number | null;
  location: string | null;
  postsPerWeek: number | null;
  /** null when unknown. 0 is stored for every post scraped without view counts, so 0 means unknown too. */
  avgViews: number | null;
  /**
   * enrichment_data.detected_brands without the creator's own handle (a
   * creator tagging their own account is not a brand deal). Duplicates are
   * kept; the reader de-duplicates.
   */
  detectedBrands: string[];
  postTypes: { postType: string | null; n: number }[];
};

export type HomepageSnapshot = {
  /** When refresh_homepage_snapshot() ran. Monitoring only, never displayed. */
  computedAt: string;
  stats: SnapshotStats;
  leaderboards: { instagram: SnapshotBoardRow[]; tiktok: SnapshotBoardRow[] };
  featuredPool: SnapshotPoolEntry[];
};

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(o: Json, key: string, where: string): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new SnapshotError(`${where}.${key} is not a number (${JSON.stringify(v)})`);
  }
  return v;
}

function numOrNull(o: Json, key: string, where: string): number | null {
  const v = o[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new SnapshotError(`${where}.${key} is not a number or null (${JSON.stringify(v)})`);
  }
  return v;
}

function str(o: Json, key: string, where: string): string {
  const v = o[key];
  if (typeof v !== 'string' || v === '') {
    throw new SnapshotError(`${where}.${key} is not a non-empty string (${JSON.stringify(v)})`);
  }
  return v;
}

function strOrNull(o: Json, key: string): string | null {
  const v = o[key];
  return typeof v === 'string' ? v : null;
}

function parseStats(v: unknown): SnapshotStats {
  if (!isObject(v)) throw new SnapshotError('payload.stats is missing');
  const where = 'payload.stats';
  const lastIndex = str(v, 'last_index', where);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastIndex)) {
    throw new SnapshotError(`${where}.last_index is not a date (${JSON.stringify(lastIndex)})`);
  }
  return {
    creators: num(v, 'creators', where),
    postsAnalyzed: num(v, 'posts_analyzed', where),
    brandDeals: num(v, 'brand_deals', where),
    igMedian: num(v, 'ig_median', where),
    tiktokMedian: num(v, 'tiktok_median', where),
    lastIndex,
  };
}

function parseBoard(v: unknown, platform: string): SnapshotBoardRow[] {
  const where = `payload.leaderboards.${platform}`;
  if (!Array.isArray(v)) throw new SnapshotError(`${where} is not an array`);
  return v.map((row, i) => {
    if (!isObject(row)) throw new SnapshotError(`${where}[${i}] is not an object`);
    const at = `${where}[${i}]`;
    return {
      handle: str(row, 'handle', at),
      displayName: str(row, 'display_name', at),
      category: str(row, 'category', at),
      followers: num(row, 'followers', at),
      engagement: num(row, 'engagement', at),
      medViews: num(row, 'med_views', at),
      posts: num(row, 'posts', at),
    };
  });
}

/** Handles compare case-insensitively and without a leading @. */
function sameHandle(a: string, b: string): boolean {
  const norm = (h: string) => h.trim().replace(/^@/, '').toLowerCase();
  return norm(a) === norm(b);
}

function parsePool(v: unknown): SnapshotPoolEntry[] {
  const where = 'payload.featured_pool';
  if (!Array.isArray(v)) throw new SnapshotError(`${where} is not an array`);
  return v.map((entry, i) => {
    if (!isObject(entry)) throw new SnapshotError(`${where}[${i}] is not an object`);
    const at = `${where}[${i}]`;
    const platform = entry.platform;
    if (platform !== 'instagram' && platform !== 'tiktok') {
      throw new SnapshotError(`${at}.platform is not instagram or tiktok (${JSON.stringify(platform)})`);
    }
    const handle = str(entry, 'handle', at);
    const brands = Array.isArray(entry.detected_brands)
      ? entry.detected_brands
          .filter((b): b is string => typeof b === 'string')
          .filter((b) => !sameHandle(b, handle))
      : [];
    const avgViews = numOrNull(entry, 'avg_views', at);
    const postTypes = Array.isArray(entry.post_types)
      ? entry.post_types.filter(isObject).map((t, j) => ({
          postType: strOrNull(t, 'post_type'),
          n: num(t, 'n', `${at}.post_types[${j}]`),
        }))
      : [];
    return {
      displayName: strOrNull(entry, 'display_name'),
      handle,
      platform,
      followers: numOrNull(entry, 'followers', at),
      engagement: numOrNull(entry, 'engagement', at),
      location: strOrNull(entry, 'location'),
      postsPerWeek: numOrNull(entry, 'posts_per_week', at),
      // Instagram posts scraped with basicData carry no view count and are
      // stored as 0 (inf-scraper mapInstagramPost), so a 0 average is "not
      // measured", not "nobody watched". The hero card omits the block.
      avgViews: avgViews !== null && avgViews > 0 ? avgViews : null,
      detectedBrands: brands,
      postTypes,
    };
  });
}

/**
 * Validates the row as selected by `select('payload, computed_at')`.
 * Throws SnapshotError naming the first field that is wrong.
 */
export function parseHomepageSnapshot(row: unknown): HomepageSnapshot {
  if (!isObject(row)) throw new SnapshotError('no homepage_snapshot row');
  const computedAt = row.computed_at;
  if (typeof computedAt !== 'string' || Number.isNaN(Date.parse(computedAt))) {
    throw new SnapshotError(`computed_at is not a timestamp (${JSON.stringify(computedAt)})`);
  }
  const payload = row.payload;
  if (!isObject(payload)) throw new SnapshotError('payload is not an object');
  const boards = payload.leaderboards;
  if (!isObject(boards)) throw new SnapshotError('payload.leaderboards is missing');
  return {
    computedAt,
    stats: parseStats(payload.stats),
    leaderboards: {
      instagram: parseBoard(boards.instagram, 'instagram'),
      tiktok: parseBoard(boards.tiktok, 'tiktok'),
    },
    featuredPool: parsePool(payload.featured_pool),
  };
}

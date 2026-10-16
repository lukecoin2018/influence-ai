/**
 * Fixed demo content for /for-creators. Nothing here is read from the
 * database, on purpose: the page is fully static so it can never hit the
 * timeouts that the homepage's live figures did.
 *
 * The example creator (120K followers, 964 brands) and the four brands are
 * taken from the influenceit_demo account's Brands Hiring list, as recorded in
 * the approved design (docs/for-creators-reference.html). The index figures
 * are rounded down on purpose ("10,000+") so they stay true as the data grows.
 * If any of them is ever changed, change it here and every place on the page
 * that repeats it follows.
 */

export const EXAMPLE_CREATOR = {
  name: 'Chloe',
  handle: 'influenceit_demo',
  platform: 'Instagram',
  followers: 120_000,
  /** Brands on the example creator's list. */
  brandCount: 964,
} as const;

/** The brand on the hero card. */
export const HERO_BRAND = {
  name: "L'Oréal Paris",
  initial: 'L',
  category: 'beauty',
  low: 60_000,
  high: 275_000,
  creatorsHired: 128,
  region: 'United States',
} as const;

export type DemoCategory = 'beauty' | 'fashion' | 'fitness' | 'retail' | 'food' | 'tech';

/** The category pills above the brand rows, in display order. */
export const CATEGORY_PILLS: ReadonlyArray<{ key: DemoCategory; count: number }> = [
  { key: 'beauty', count: 403 },
  { key: 'fashion', count: 317 },
  { key: 'fitness', count: 58 },
  { key: 'retail', count: 46 },
  { key: 'food', count: 30 },
  { key: 'tech', count: 29 },
];

/** Categories not shown as pills ("+ 8 more"). */
export const MORE_CATEGORY_COUNT = 8;

export const BRAND_ROWS: ReadonlyArray<{
  name: string;
  initial: string;
  category: DemoCategory;
  creatorsHired: number;
  badge: 'repeatHirer' | 'program';
  low: number;
  high: number;
}> = [
  { name: 'Shein', initial: 'S', category: 'fashion', creatorsHired: 166, badge: 'repeatHirer', low: 65_000, high: 229_000 },
  { name: 'MAC Cosmetics', initial: 'M', category: 'beauty', creatorsHired: 129, badge: 'program', low: 61_000, high: 211_000 },
  { name: 'Make Up For Ever', initial: 'M', category: 'beauty', creatorsHired: 50, badge: 'program', low: 60_000, high: 227_000 },
];

/** "How we know" figures. Rounded, and written as display strings on purpose. */
export const INDEX_FIGURES = {
  sponsoredPosts: '25,000+',
  postsAnalyzed: '275,000+',
  creatorsIndexed: '10,000+',
} as const;

/** 120000 → "120K". The demo numbers are all whole thousands. */
export function formatK(n: number): string {
  return `${Math.round(n / 1000)}K`;
}

/**
 * Where the creator's marker sits on a brand's follower range, as a CSS
 * percentage. The bar runs from the brand's low to its high end, so 120K on
 * 60K–275K sits at 28%, as in the design.
 */
export function markerPosition(followers: number, low: number, high: number): string {
  const pct = ((followers - low) / (high - low)) * 100;
  return `${Math.min(100, Math.max(0, Math.round(pct)))}%`;
}

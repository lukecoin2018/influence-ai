import { describe, expect, it } from 'vitest';
import {
  buildCreatorBrandMatches,
  selectHeroBrand,
  teaserPreviewExcluding,
  HERO_CATEGORY_FLOOR,
  HERO_MAGNITUDE_CAP,
  type BrandBracketRow,
  type CreatorProfile,
} from './creator-brand-matches';

const NOW = new Date('2026-07-11T00:00:00Z');

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

function bracket(overrides: Partial<BrandBracketRow> & { canonicalName: string }): BrandBracketRow {
  return {
    platform: 'instagram',
    category: 'Fitness',
    p25Followers: 150_000,
    p75Followers: 300_000,
    distinctCreators: 15,
    repeatRatio: 3,
    mostRecentPost: daysAgo(3),
    regions: [],
    ...overrides,
  };
}

describe('buildCreatorBrandMatches — bracket overlap', () => {
  const profiles: CreatorProfile[] = [{ platform: 'instagram', followerCount: 182_000 }];

  it('matches a brand when follower_count falls strictly within p25-p75', () => {
    const result = buildCreatorBrandMatches(null, profiles, [bracket({ canonicalName: 'Gymshark' })], NOW);
    expect(result.totalMatchCount).toBe(1);
  });

  it('matches at the widened boundary (p25 x 0.7) but not just below it', () => {
    // p25=150K, x0.7 = 105K exactly
    const atBoundary = bracket({ canonicalName: 'AtLow', p25Followers: 150_000, p75Followers: 300_000 });

    const atResult = buildCreatorBrandMatches(null, [{ platform: 'instagram', followerCount: 105_000 }], [atBoundary], NOW);
    expect(atResult.totalMatchCount).toBe(1);

    const belowResult = buildCreatorBrandMatches(null, [{ platform: 'instagram', followerCount: 104_999 }], [atBoundary], NOW);
    expect(belowResult.totalMatchCount).toBe(0);
  });

  it('matches at the widened boundary (p75 x 1.3) but not just above it', () => {
    const b = bracket({ canonicalName: 'AtHigh', p25Followers: 150_000, p75Followers: 300_000 });
    const atResult = buildCreatorBrandMatches(null, [{ platform: 'instagram', followerCount: 390_000 }], [b], NOW);
    expect(atResult.totalMatchCount).toBe(1);

    const aboveResult = buildCreatorBrandMatches(null, [{ platform: 'instagram', followerCount: 390_001 }], [b], NOW);
    expect(aboveResult.totalMatchCount).toBe(0);
  });

  it('does not match when the platform differs, even if follower_count overlaps', () => {
    const tiktokBracket = bracket({ canonicalName: 'TikTokOnly', platform: 'tiktok' });
    const result = buildCreatorBrandMatches(null, profiles, [tiktokBracket], NOW);
    expect(result.totalMatchCount).toBe(0);
  });
});

describe('buildCreatorBrandMatches — isProgram / isRepeatHirer', () => {
  const profiles: CreatorProfile[] = [{ platform: 'instagram', followerCount: 200_000 }];

  it('flags isProgram at exactly 3 distinct creators, not below', () => {
    const program = buildCreatorBrandMatches(null, profiles, [bracket({ canonicalName: 'Program', distinctCreators: 3 })], NOW);
    expect(program.strongestMatch?.isProgram).toBe(true);

    const sighting = buildCreatorBrandMatches(null, profiles, [bracket({ canonicalName: 'Sighting', distinctCreators: 2 })], NOW);
    expect(sighting.strongestMatch?.isProgram).toBe(false);
  });

  it('flags isRepeatHirer at exactly repeat_ratio 2, not below', () => {
    const repeat = buildCreatorBrandMatches(null, profiles, [bracket({ canonicalName: 'Repeat', repeatRatio: 2 })], NOW);
    expect(repeat.strongestMatch?.isRepeatHirer).toBe(true);

    const oneOff = buildCreatorBrandMatches(null, profiles, [bracket({ canonicalName: 'OneOff', repeatRatio: 1.9 })], NOW);
    expect(oneOff.strongestMatch?.isRepeatHirer).toBe(false);
  });
});

describe('buildCreatorBrandMatches — cross-platform dedupe', () => {
  it('collapses the same canonicalName matched on both platforms into one row, keeping the higher-ranked platform', () => {
    const profiles: CreatorProfile[] = [
      { platform: 'instagram', followerCount: 200_000 },
      { platform: 'tiktok', followerCount: 200_000 },
    ];
    const igMatch = bracket({ canonicalName: 'Gymshark', platform: 'instagram', mostRecentPost: daysAgo(50) }); // window bucket
    const tiktokMatch = bracket({ canonicalName: 'Gymshark', platform: 'tiktok', mostRecentPost: daysAgo(2) }); // active bucket, should win

    const result = buildCreatorBrandMatches(null, profiles, [igMatch, tiktokMatch], NOW);

    expect(result.totalMatchCount).toBe(1);
    expect(result.strongestMatch?.platform).toBe('tiktok');
    expect(result.strongestMatch?.recencyBucket).toBe('active');
  });

  it("sets creatorFollowers from the strongest match's platform, not an arbitrary one", () => {
    const profiles: CreatorProfile[] = [
      { platform: 'instagram', followerCount: 111_000 },
      { platform: 'tiktok', followerCount: 222_000 },
    ];
    const tiktokOnly = bracket({ canonicalName: 'TikTokBrand', platform: 'tiktok', p25Followers: 150_000, p75Followers: 300_000 });

    const result = buildCreatorBrandMatches(null, profiles, [tiktokOnly], NOW);
    expect(result.strongestMatch?.platform).toBe('tiktok');
    expect(result.creatorFollowers).toBe(222_000);
  });
});

describe('buildCreatorBrandMatches — ranking (magnitude order)', () => {
  const profiles: CreatorProfile[] = [{ platform: 'instagram', followerCount: 200_000 }];

  it('ranks on capped magnitude first, above recency and region', () => {
    const bigStale = bracket({ canonicalName: 'BigStale', distinctCreators: 9, mostRecentPost: daysAgo(200), regions: [] });
    const smallFreshLocal = bracket({ canonicalName: 'SmallFreshLocal', distinctCreators: 2, mostRecentPost: daysAgo(1), regions: ['US'] });

    const result = buildCreatorBrandMatches('United States', profiles, [bigStale, smallFreshLocal], NOW);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['BigStale', 'SmallFreshLocal']);
  });

  it('caps magnitude — above HERO_MAGNITUDE_CAP, brands tie and recency decides', () => {
    const huge = bracket({ canonicalName: 'Huge', distinctCreators: 400, mostRecentPost: daysAgo(50) });
    const atCap = bracket({ canonicalName: 'AtCap', distinctCreators: HERO_MAGNITUDE_CAP, mostRecentPost: daysAgo(1) });

    const result = buildCreatorBrandMatches(null, profiles, [huge, atCap], NOW);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['AtCap', 'Huge']);
  });

  it('no longer ranks on repeatRatio — a repeat-hirer does not outrank a bigger brand', () => {
    const oneCreatorManyPosts = bracket({ canonicalName: 'OneCreatorManyPosts', distinctCreators: 1, repeatRatio: 20 });
    const manyCreators = bracket({ canonicalName: 'ManyCreators', distinctCreators: 8, repeatRatio: 1 });

    const result = buildCreatorBrandMatches(null, profiles, [oneCreatorManyPosts, manyCreators], NOW);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['ManyCreators', 'OneCreatorManyPosts']);
  });

  it('ranks by recency bucket once magnitude ties', () => {
    const active = bracket({ canonicalName: 'Active', mostRecentPost: daysAgo(1) });
    const inWindow = bracket({ canonicalName: 'InWindow', mostRecentPost: daysAgo(50) });

    const result = buildCreatorBrandMatches(null, profiles, [inWindow, active], NOW);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['Active', 'InWindow']);
  });

  it('region is a tiebreak only — never promotes a weaker-but-local brand above a genuinely stronger one', () => {
    const strongerNoRegion = bracket({ canonicalName: 'StrongerNoRegion', distinctCreators: 9, mostRecentPost: daysAgo(1), regions: [] });
    const weakerWithRegion = bracket({ canonicalName: 'WeakerWithRegion', distinctCreators: 2, mostRecentPost: daysAgo(1), regions: ['US'] });

    const result = buildCreatorBrandMatches('United States', profiles, [strongerNoRegion, weakerWithRegion], NOW);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['StrongerNoRegion', 'WeakerWithRegion']);
  });

  it('region breaks a tie when everything else is equal', () => {
    const noRegion = bracket({ canonicalName: 'NoRegion', regions: [] });
    const withRegion = bracket({ canonicalName: 'WithRegion', regions: ['US'] });

    const result = buildCreatorBrandMatches('United States', profiles, [noRegion, withRegion], NOW);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['WithRegion', 'NoRegion']);
  });

  it('falls back to raw recency before the name tiebreak', () => {
    const older = bracket({ canonicalName: 'Older', mostRecentPost: daysAgo(5) });
    const newer = bracket({ canonicalName: 'Newer', mostRecentPost: daysAgo(1) });

    const result = buildCreatorBrandMatches(null, profiles, [older, newer], NOW);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['Newer', 'Older']);
  });

  it('breaks a total tie on canonicalName, regardless of input order', () => {
    const zebra = bracket({ canonicalName: 'Zebra' });
    const acme = bracket({ canonicalName: 'Acme' });

    const result = buildCreatorBrandMatches(null, profiles, [zebra, acme], NOW);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['Acme', 'Zebra']);

    const reversed = buildCreatorBrandMatches(null, profiles, [acme, zebra], NOW);
    expect(reversed.matches.map((m) => m.canonicalName)).toEqual(['Acme', 'Zebra']);
  });

  it('never excludes a one-creator brand — it sorts last but still gets a card', () => {
    const thin = bracket({ canonicalName: 'Thin', distinctCreators: 1 });
    const big = bracket({ canonicalName: 'Big', distinctCreators: 20 });

    const result = buildCreatorBrandMatches(null, profiles, [thin, big], NOW);
    expect(result.totalMatchCount).toBe(2);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['Big', 'Thin']);
  });
});

describe('selectHeroBrand', () => {
  const profiles: CreatorProfile[] = [{ platform: 'instagram', followerCount: 200_000 }];

  function sorted(brackets: BrandBracketRow[]) {
    return buildCreatorBrandMatches(null, profiles, brackets, NOW).matches;
  }

  it('returns the top match when the niche is null', () => {
    const matches = sorted([bracket({ canonicalName: 'Top', distinctCreators: 20 })]);
    expect(selectHeroBrand(matches, null)?.canonicalName).toBe('Top');
  });

  it('returns the top match when the niche maps to nothing', () => {
    const matches = sorted([
      bracket({ canonicalName: 'Top', distinctCreators: 20, category: 'Beauty' }),
      bracket({ canonicalName: 'Other', distinctCreators: 8, category: 'Fashion' }),
    ]);
    // luxury/gaming/lifestyle are deliberately unmapped in NICHE_TO_BUCKET.
    expect(selectHeroBrand(matches, 'luxury')?.canonicalName).toBe('Top');
    expect(selectHeroBrand(matches, 'some-niche-nobody-has-seen-yet')?.canonicalName).toBe('Top');
  });

  it('promotes a niche-matching brand that clears the floor', () => {
    const matches = sorted([
      bracket({ canonicalName: 'TopBeauty', distinctCreators: 20, category: 'Beauty' }),
      bracket({ canonicalName: 'SomeFashion', distinctCreators: HERO_CATEGORY_FLOOR, category: 'Fashion' }),
    ]);
    expect(selectHeroBrand(matches, 'fashion')?.canonicalName).toBe('SomeFashion');
  });

  it('matches on the CONSOLIDATED category, not the raw one', () => {
    // 'Sportswear' consolidates to 'Fitness & Wellness', which is what the
    // fitness niche maps to. Comparing raw values would miss this.
    const matches = sorted([
      bracket({ canonicalName: 'TopBeauty', distinctCreators: 20, category: 'Beauty' }),
      bracket({ canonicalName: 'Sporty', distinctCreators: 7, category: 'Sportswear' }),
    ]);
    expect(selectHeroBrand(matches, 'fitness')?.canonicalName).toBe('Sporty');
  });

  it('declines to promote a niche match below the floor', () => {
    const matches = sorted([
      bracket({ canonicalName: 'TopBeauty', distinctCreators: 20, category: 'Beauty' }),
      bracket({ canonicalName: 'ThinFashion', distinctCreators: HERO_CATEGORY_FLOOR - 1, category: 'Fashion' }),
    ]);
    expect(selectHeroBrand(matches, 'fashion')?.canonicalName).toBe('TopBeauty');
  });

  it('promotes the STRONGEST qualifying brand in the bucket, not the first seen', () => {
    const matches = sorted([
      bracket({ canonicalName: 'TopBeauty', distinctCreators: 20, category: 'Beauty' }),
      bracket({ canonicalName: 'WeakFashion', distinctCreators: 5, category: 'Fashion', mostRecentPost: daysAgo(200) }),
      bracket({ canonicalName: 'StrongFashion', distinctCreators: 9, category: 'Fashion', mostRecentPost: daysAgo(1) }),
    ]);
    expect(selectHeroBrand(matches, 'fashion')?.canonicalName).toBe('StrongFashion');
  });

  it('returns null for an empty list', () => {
    expect(selectHeroBrand([], 'fashion')).toBeNull();
    expect(selectHeroBrand([], null)).toBeNull();
  });

  it('never excludes anything — the match list is untouched by the gate', () => {
    const brackets = [
      bracket({ canonicalName: 'TopBeauty', distinctCreators: 20, category: 'Beauty' }),
      bracket({ canonicalName: 'ThinFashion', distinctCreators: 1, category: 'Fashion' }),
    ];
    const matches = sorted(brackets);
    selectHeroBrand(matches, 'fashion');
    expect(matches).toHaveLength(2);
  });
});

describe('teaserPreviewExcluding', () => {
  const profiles: CreatorProfile[] = [{ platform: 'instagram', followerCount: 200_000 }];

  it('omits the hero, so a promoted brand is never blurred beneath its own card', () => {
    const matches = buildCreatorBrandMatches(null, profiles, [
      bracket({ canonicalName: 'TopBeauty', distinctCreators: 20, category: 'Beauty', mostRecentPost: daysAgo(1) }),
      bracket({ canonicalName: 'Second', distinctCreators: 15, category: 'Retail', mostRecentPost: daysAgo(20) }),
      bracket({ canonicalName: 'StrongFashion', distinctCreators: 9, category: 'Fashion' }),
    ], NOW).matches;
    expect(matches.map((m) => m.canonicalName)).toEqual(['TopBeauty', 'Second', 'StrongFashion']);

    const hero = selectHeroBrand(matches, 'fashion');
    expect(hero?.canonicalName).toBe('StrongFashion');

    const preview = teaserPreviewExcluding(matches, hero);
    expect(preview).toHaveLength(2);
    expect(preview.map((p) => p.category)).toEqual(['Beauty', 'Retail']);
  });

  it('caps at 3 rows', () => {
    const brackets = Array.from({ length: 6 }, (_, i) => bracket({ canonicalName: `Brand${i}`, mostRecentPost: daysAgo(i) }));
    const matches = buildCreatorBrandMatches(null, profiles, brackets, NOW).matches;
    expect(teaserPreviewExcluding(matches, matches[0])).toHaveLength(3);
  });

  it('carries no canonicalName or exact bracket into the blurred rows', () => {
    const matches = buildCreatorBrandMatches(null, profiles, [
      bracket({ canonicalName: 'Hero' }),
      bracket({ canonicalName: 'Represent Ltd', category: 'Fashion' }),
    ], NOW).matches;

    const row = teaserPreviewExcluding(matches, matches[0])[0] as unknown as Record<string, unknown>;
    expect(row.canonicalName).toBeUndefined();
    expect(row.p25Followers).toBeUndefined();
    expect(row.p75Followers).toBeUndefined();
  });
});

describe('buildCreatorBrandMatches — teaser shape', () => {
  const profiles: CreatorProfile[] = [{ platform: 'instagram', followerCount: 200_000 }];

  it('caps the teaser preview at 3 even when more matches exist', () => {
    const brackets = Array.from({ length: 6 }, (_, i) => bracket({ canonicalName: `Brand${i}`, mostRecentPost: daysAgo(i) }));
    const result = buildCreatorBrandMatches(null, profiles, brackets, NOW);

    expect(result.totalMatchCount).toBe(6);
    expect(result.teaserPreview).toHaveLength(3);
  });

  it('shows fewer than 3 preview rows when fewer remain', () => {
    const brackets = [bracket({ canonicalName: 'Strongest' }), bracket({ canonicalName: 'Second' })];
    const result = buildCreatorBrandMatches(null, profiles, brackets, NOW);
    expect(result.teaserPreview).toHaveLength(1);
  });

  it('blurred preview rows never carry canonicalName or the exact bracket', () => {
    // Recency, not the name tiebreak, decides which of these leads — otherwise
    // 'Represent Ltd' sorts ahead of 'Strongest' alphabetically and the row
    // under test would be the wrong one.
    const brackets = [
      bracket({ canonicalName: 'Strongest', mostRecentPost: daysAgo(1) }),
      bracket({ canonicalName: 'Represent Ltd', category: 'Fashion', mostRecentPost: daysAgo(2) }),
    ];
    const result = buildCreatorBrandMatches(null, profiles, brackets, NOW);
    expect(result.strongestMatch?.canonicalName).toBe('Strongest');

    const preview = result.teaserPreview[0] as unknown as Record<string, unknown>;
    expect(preview.canonicalName).toBeUndefined();
    expect(preview.p25Followers).toBeUndefined();
    expect(preview.p75Followers).toBeUndefined();
    expect(preview.category).toBe('Fashion');
  });
});

describe('buildCreatorBrandMatches — empty and thin states', () => {
  it('returns an honest empty result with no matches, never a fallback', () => {
    const profiles: CreatorProfile[] = [{ platform: 'instagram', followerCount: 200_000 }];
    const result = buildCreatorBrandMatches(null, profiles, [], NOW);

    expect(result).toEqual({ creatorFollowers: null, totalMatchCount: 0, matches: [], strongestMatch: null, teaserPreview: [] });
  });

  it('never filters or penalizes a creator with no country — full match list regardless', () => {
    const profiles: CreatorProfile[] = [{ platform: 'instagram', followerCount: 200_000 }];
    const withRegion = bracket({ canonicalName: 'WithRegion', regions: ['US'] });

    const result = buildCreatorBrandMatches(null, profiles, [withRegion], NOW);
    expect(result.totalMatchCount).toBe(1);
    expect(result.strongestMatch?.regionMatch).toBeNull();
  });
});

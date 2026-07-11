import { describe, expect, it } from 'vitest';
import { buildCreatorBrandMatches, type BrandBracketRow, type CreatorProfile } from './creator-brand-matches';

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

describe('buildCreatorBrandMatches — ranking (LOCKED order)', () => {
  const profiles: CreatorProfile[] = [{ platform: 'instagram', followerCount: 200_000 }];

  it('ranks programs above sightings regardless of recency/repeat-ratio', () => {
    const strongSighting = bracket({ canonicalName: 'Sighting', distinctCreators: 2, repeatRatio: 10, mostRecentPost: daysAgo(1) });
    const weakProgram = bracket({ canonicalName: 'Program', distinctCreators: 3, repeatRatio: 2, mostRecentPost: daysAgo(89) });

    const result = buildCreatorBrandMatches(null, profiles, [strongSighting, weakProgram], NOW);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['Program', 'Sighting']);
  });

  it('ranks by recency bucket before repeat-ratio, within the same program/sighting tier', () => {
    const activeLowRatio = bracket({ canonicalName: 'ActiveLowRatio', repeatRatio: 2, mostRecentPost: daysAgo(1) });
    const windowHighRatio = bracket({ canonicalName: 'WindowHighRatio', repeatRatio: 20, mostRecentPost: daysAgo(50) });

    const result = buildCreatorBrandMatches(null, profiles, [activeLowRatio, windowHighRatio], NOW);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['ActiveLowRatio', 'WindowHighRatio']);
  });

  it('region is a tiebreak only — never promotes a weaker-but-local brand above a genuinely stronger one', () => {
    const strongerNoRegion = bracket({ canonicalName: 'StrongerNoRegion', repeatRatio: 10, mostRecentPost: daysAgo(1), regions: [] });
    const weakerWithRegion = bracket({ canonicalName: 'WeakerWithRegion', repeatRatio: 2, mostRecentPost: daysAgo(1), regions: ['US'] });

    const result = buildCreatorBrandMatches('United States', profiles, [strongerNoRegion, weakerWithRegion], NOW);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['StrongerNoRegion', 'WeakerWithRegion']);
  });

  it('region breaks a tie when everything else is equal', () => {
    const noRegion = bracket({ canonicalName: 'NoRegion', regions: [] });
    const withRegion = bracket({ canonicalName: 'WithRegion', regions: ['US'] });

    const result = buildCreatorBrandMatches('United States', profiles, [noRegion, withRegion], NOW);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['WithRegion', 'NoRegion']);
  });

  it('falls back to raw recency as the final tiebreak', () => {
    const older = bracket({ canonicalName: 'Older', mostRecentPost: daysAgo(5) });
    const newer = bracket({ canonicalName: 'Newer', mostRecentPost: daysAgo(1) });

    const result = buildCreatorBrandMatches(null, profiles, [older, newer], NOW);
    expect(result.matches.map((m) => m.canonicalName)).toEqual(['Newer', 'Older']);
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
    const brackets = [bracket({ canonicalName: 'Strongest' }), bracket({ canonicalName: 'Represent Ltd', category: 'Fashion' })];
    const result = buildCreatorBrandMatches(null, profiles, brackets, NOW);

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

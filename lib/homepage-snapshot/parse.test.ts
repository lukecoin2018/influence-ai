import { describe, expect, it } from 'vitest';
import { parseHomepageSnapshot, SnapshotError } from './parse';
import { bucketContentMix } from '@/app/_data';

function row(overrides: Record<string, unknown> = {}) {
  const board = (handle: string) => ({
    handle,
    display_name: handle.toUpperCase(),
    category: 'Uncategorized',
    followers: 50000,
    engagement: 12.3,
    med_views: 40000,
    posts: 12,
  });
  return {
    computed_at: '2026-10-14T12:17:03.512+00:00',
    payload: {
      version: 1,
      stats: {
        creators: 10694,
        posts_analyzed: 276714,
        brand_deals: 25939,
        ig_median: 1.3,
        tiktok_median: 1.3,
        last_index: '2026-10-14',
      },
      leaderboards: { instagram: [board('a'), board('b')], tiktok: [board('t')] },
      featured_pool: [
        {
          display_name: null,
          handle: 'a',
          platform: 'instagram',
          followers: 50000,
          engagement: 12.3,
          location: null,
          posts_per_week: null,
          avg_views: 120,
          detected_brands: ['nike', 'nike', '', 7],
          post_types: [{ post_type: 'Video', n: 3 }, { post_type: null, n: 1 }],
        },
      ],
      ...overrides,
    },
  };
}

describe('parseHomepageSnapshot', () => {
  it('maps a well-formed row', () => {
    const s = parseHomepageSnapshot(row());
    expect(s.stats).toEqual({
      creators: 10694,
      postsAnalyzed: 276714,
      brandDeals: 25939,
      igMedian: 1.3,
      tiktokMedian: 1.3,
      lastIndex: '2026-10-14',
    });
    expect(s.leaderboards.instagram.map((r) => r.handle)).toEqual(['a', 'b']);
    expect(s.leaderboards.tiktok[0]).toMatchObject({ displayName: 'T', medViews: 40000 });
    expect(s.featuredPool[0]).toMatchObject({
      displayName: null,
      postsPerWeek: null,
      avgViews: 120,
      detectedBrands: ['nike', 'nike', ''],
      postTypes: [{ postType: 'Video', n: 3 }, { postType: null, n: 1 }],
    });
    expect(s.computedAt).toBe('2026-10-14T12:17:03.512+00:00');
  });

  it('throws when there is no row, rather than inventing figures', () => {
    expect(() => parseHomepageSnapshot(null)).toThrow(SnapshotError);
  });

  it('throws on a missing or null stat', () => {
    const noMedian = row();
    (noMedian.payload.stats as Record<string, unknown>).ig_median = null;
    expect(() => parseHomepageSnapshot(noMedian)).toThrow(/stats\.ig_median/);
    const noCreators = row();
    delete (noCreators.payload.stats as Record<string, unknown>).creators;
    expect(() => parseHomepageSnapshot(noCreators)).toThrow(/stats\.creators/);
  });

  it('throws on a last_index that is not a date', () => {
    const r = row();
    (r.payload.stats as Record<string, unknown>).last_index = 'Jul 3, 2026';
    expect(() => parseHomepageSnapshot(r)).toThrow(/last_index/);
  });

  it('throws on a malformed leaderboard row, naming it', () => {
    const r = row({ leaderboards: { instagram: [{ handle: 'x' }], tiktok: [] } });
    expect(() => parseHomepageSnapshot(r)).toThrow(/leaderboards\.instagram\[0\]\.display_name/);
  });

  it('accepts an empty leaderboard (the page hides it) but not a missing one', () => {
    expect(parseHomepageSnapshot(row({ leaderboards: { instagram: [], tiktok: [] } })).leaderboards.tiktok).toEqual([]);
    expect(() => parseHomepageSnapshot(row({ leaderboards: { instagram: [] } }))).toThrow(/tiktok is not an array/);
  });

  it('ignores payload keys it does not know, so other pages can add figures', () => {
    expect(() => parseHomepageSnapshot(row({ for_creators: { anything: 1 } }))).not.toThrow();
  });

  it("drops the creator's own handle from detected_brands, however it is written", () => {
    const r = row();
    const entry = (r.payload.featured_pool as Record<string, unknown>[])[0];
    entry.handle = 'sammybatchelder';
    entry.detected_brands = ['roadwaymoving', 'SammyBatchelder', '@sammybatchelder', 'drinkpoppi'];
    expect(parseHomepageSnapshot(r).featuredPool[0].detectedBrands).toEqual(['roadwaymoving', 'drinkpoppi']);
  });

  it('treats avg_views of 0 as unknown, keeps a real average', () => {
    const zero = row();
    (zero.payload.featured_pool as Record<string, unknown>[])[0].avg_views = 0;
    expect(parseHomepageSnapshot(zero).featuredPool[0].avgViews).toBeNull();
    const real = row();
    (real.payload.featured_pool as Record<string, unknown>[])[0].avg_views = 33109;
    expect(parseHomepageSnapshot(real).featuredPool[0].avgViews).toBe(33109);
  });

  it('throws on a computed_at that is not a timestamp', () => {
    expect(() => parseHomepageSnapshot({ ...row(), computed_at: 'yesterday' })).toThrow(/computed_at/);
  });
});

describe('bucketContentMix (per-type counts)', () => {
  it('buckets counts and rounds percentages', () => {
    expect(
      bucketContentMix([
        { postType: 'Video', n: 2 },
        { postType: 'Sidecar', n: 1 },
        { postType: 'Image', n: 1 },
      ]),
    ).toEqual([
      { label: 'Video', pct: 50, color: 'yellow' },
      { label: 'Carousel', pct: 25, color: 'ink' },
      { label: 'Photo', pct: 25, color: 'gray' },
    ]);
  });

  it('returns nothing for no posts, so the card omits the block', () => {
    expect(bucketContentMix([])).toEqual([]);
    expect(bucketContentMix([{ postType: 'Video', n: 0 }])).toEqual([]);
  });

  it('merges types that land in the same bucket', () => {
    expect(bucketContentMix([{ postType: 'Video', n: 1 }, { postType: 'Reel', n: 1 }])).toEqual([
      { label: 'Video', pct: 100, color: 'yellow' },
    ]);
  });
});

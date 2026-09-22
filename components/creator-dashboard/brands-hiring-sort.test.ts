import { describe, expect, it } from 'vitest';
import type { MatchedBrand } from '@/lib/reports/creator-brand-matches';
import { normalizeSort, sortMatches } from './brands-hiring-sort';
import { pageSlots } from './BrandsHiringPager';

/**
 * Only the three fields the sorts read are meaningful here; the rest exist so
 * the object satisfies MatchedBrand. The array order in each test IS "best
 * match" — that is the contract the index tiebreak relies on.
 */
function brand(canonicalName: string, distinctCreators: number, mostRecentPost: string | null): MatchedBrand {
  return {
    canonicalName,
    category: null,
    platform: 'instagram',
    isProgram: false,
    isRepeatHirer: false,
    p25Followers: 0,
    p75Followers: 0,
    distinctCreators,
    repeatRatio: 0,
    mostRecentPost,
    recencyBucket: 'neutral',
    regionMatch: null,
    handles: [],
  };
}

const names = (list: MatchedBrand[]) => list.map((m) => m.canonicalName);

describe('normalizeSort', () => {
  it('accepts the three whitelisted values', () => {
    expect(normalizeSort('match')).toBe('match');
    expect(normalizeSort('active')).toBe('active');
    expect(normalizeSort('recent')).toBe('recent');
  });

  it('falls back to the default for anything else', () => {
    for (const raw of [null, undefined, '', 'Active', 'best', '1', 'match ']) {
      expect(normalizeSort(raw)).toBe('match');
    }
  });
});

describe('sortMatches', () => {
  it('returns the input untouched for the default sort', () => {
    const input = [brand('B', 1, null), brand('A', 9, null)];
    expect(sortMatches(input, 'match')).toBe(input);
  });

  it('never sorts the input array in place', () => {
    const input = [brand('B', 1, '2026-01-01'), brand('A', 9, '2026-02-01')];
    sortMatches(input, 'active');
    sortMatches(input, 'recent');
    expect(names(input)).toEqual(['B', 'A']);
  });

  it('orders by distinct creators, descending, for "active"', () => {
    const input = [brand('A', 3, null), brand('B', 40, null), brand('C', 12, null)];
    expect(names(sortMatches(input, 'active'))).toEqual(['B', 'C', 'A']);
  });

  it('breaks an "active" tie by the incoming best-match order', () => {
    const input = [brand('A', 5, null), brand('B', 5, null), brand('C', 5, null)];
    expect(names(sortMatches(input, 'active'))).toEqual(['A', 'B', 'C']);
  });

  it('orders by most recent post, newest first, for "recent"', () => {
    const input = [
      brand('A', 1, '2026-01-05T00:00:00Z'),
      brand('B', 1, '2026-09-01T00:00:00Z'),
      brand('C', 1, '2026-04-20T00:00:00Z'),
    ];
    expect(names(sortMatches(input, 'recent'))).toEqual(['B', 'C', 'A']);
  });

  it('puts brands with no known post date last, not first', () => {
    const input = [brand('A', 1, null), brand('B', 1, '2020-01-01T00:00:00Z'), brand('C', 1, null)];
    expect(names(sortMatches(input, 'recent'))).toEqual(['B', 'A', 'C']);
  });

  it('breaks a "recent" tie — including a tie between two dateless brands — by best match', () => {
    const same = '2026-03-03T00:00:00Z';
    const input = [brand('A', 1, same), brand('B', 1, null), brand('C', 1, same), brand('D', 1, null)];
    expect(names(sortMatches(input, 'recent'))).toEqual(['A', 'C', 'B', 'D']);
  });
});

describe('pageSlots', () => {
  it('lists every page when there are seven or fewer', () => {
    expect(pageSlots(1, 1)).toEqual([1]);
    expect(pageSlots(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps seven slots near the start, the middle and the end', () => {
    expect(pageSlots(1, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20]);
    expect(pageSlots(10, 20)).toEqual([1, 'ellipsis', 9, 10, 11, 'ellipsis', 20]);
    expect(pageSlots(20, 20)).toEqual([1, 'ellipsis', 16, 17, 18, 19, 20]);
  });

  it('always offers the first and last page', () => {
    for (let current = 1; current <= 14; current++) {
      const slots = pageSlots(current, 14);
      expect(slots).toContain(1);
      expect(slots).toContain(14);
      expect(slots).toContain(current);
    }
  });
});

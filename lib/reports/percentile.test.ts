import { describe, expect, it } from 'vitest';
import { percentileCont } from './percentile';

describe('percentileCont', () => {
  it('returns null for an empty array', () => {
    expect(percentileCont([], 0.25)).toBeNull();
  });

  it('returns the single value when there is only one element', () => {
    expect(percentileCont([42], 0.25)).toBe(42);
    expect(percentileCont([42], 0.75)).toBe(42);
  });

  it('matches percentile_cont for an exact-rank case (n=5)', () => {
    // rank = 0.25 * 4 = 1 -> exact index, no interpolation
    const values = [10, 20, 30, 40, 50];
    expect(percentileCont(values, 0.25)).toBe(20);
    // rank = 0.75 * 4 = 3 -> exact index
    expect(percentileCont(values, 0.75)).toBe(40);
  });

  it('interpolates between ranks when the fraction lands between two elements (n=4)', () => {
    // rank = 0.25 * 3 = 0.75 -> interpolate between index 0 (10) and 1 (20)
    const values = [10, 20, 30, 40];
    expect(percentileCont(values, 0.25)).toBeCloseTo(17.5);
    // rank = 0.75 * 3 = 2.25 -> interpolate between index 2 (30) and 3 (40)
    expect(percentileCont(values, 0.75)).toBeCloseTo(32.5);
  });

  it('requires the input to already be sorted (does not sort internally)', () => {
    // Same multiset as [3, 5, 7, 1000], deliberately out of order.
    const unsorted = [5, 1000, 7, 3];
    const result = percentileCont(unsorted, 0.25);
    // rank = 0.25 * 3 = 0.75 -> interpolates between unsorted[0]=5 and unsorted[1]=1000, not the sorted p25.
    expect(result).toBeCloseTo(5 + 0.75 * (1000 - 5));
    expect(result).not.toBeCloseTo(percentileCont([3, 5, 7, 1000], 0.25)!);
  });
});

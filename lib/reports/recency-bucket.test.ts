import { describe, expect, it } from 'vitest';
import { bucketRecency, recencyBucketRank } from './recency-bucket';

const NOW = new Date('2026-07-11T00:00:00Z');

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

describe('bucketRecency', () => {
  it('returns "neutral" when there is no dated activity', () => {
    expect(bucketRecency(null, NOW)).toBe('neutral');
  });

  it('returns "active" at and under the 4-week (28-day) threshold', () => {
    expect(bucketRecency(daysAgo(0), NOW)).toBe('active');
    expect(bucketRecency(daysAgo(28), NOW)).toBe('active');
  });

  it('returns "window" just past 4 weeks and up to 3 months (90 days)', () => {
    expect(bucketRecency(daysAgo(29), NOW)).toBe('window');
    expect(bucketRecency(daysAgo(90), NOW)).toBe('window');
  });

  it('returns "neutral" past 3 months', () => {
    expect(bucketRecency(daysAgo(91), NOW)).toBe('neutral');
    expect(bucketRecency(daysAgo(400), NOW)).toBe('neutral');
  });
});

describe('recencyBucketRank', () => {
  it('ranks active < window < neutral', () => {
    expect(recencyBucketRank('active')).toBeLessThan(recencyBucketRank('window'));
    expect(recencyBucketRank('window')).toBeLessThan(recencyBucketRank('neutral'));
  });
});

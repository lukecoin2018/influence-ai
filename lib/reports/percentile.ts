/**
 * Replicates Postgres's `percentile_cont(fraction) WITHIN GROUP (ORDER BY x)` —
 * linear interpolation between the two closest ranks. Used by
 * scripts/brand-brackets/refresh.ts instead of a `percentile_cont` SQL call:
 * the refresh script has to run against live data before the brand_brackets
 * migration (which would carry any new SQL function) can be applied — manually,
 * per this repo's migration workflow — so the percentile math is computed
 * client-side. This is the exact interpolation formula Postgres uses, not an
 * approximation.
 */
export function percentileCont(sortedValues: number[], fraction: number): number | null {
  const n = sortedValues.length;
  if (n === 0) return null;
  if (n === 1) return sortedValues[0];

  const rank = fraction * (n - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sortedValues[lower];

  return sortedValues[lower] + (rank - lower) * (sortedValues[upper] - sortedValues[lower]);
}

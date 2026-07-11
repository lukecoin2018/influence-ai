/**
 * Buckets a brand's most_recent_post date into the LOCKED recency tiers.
 * Returns the enum + nothing else — the "{n} weeks ago" copy and the
 * per-surface wording (full card vs blurred row) are a component-layer
 * concern, computed at render time from the raw date so the number is always
 * accurate to when the page actually renders, not to whenever this ran.
 */

export type RecencyBucket = 'active' | 'window' | 'neutral';

const ACTIVE_THRESHOLD_DAYS = 28; // 4 weeks
const WINDOW_THRESHOLD_DAYS = 90; // ~3 months

/** `now` is a parameter (not Date.now() internally) so this stays deterministic and testable. */
export function bucketRecency(mostRecentPost: string | null, now: Date): RecencyBucket {
  if (!mostRecentPost) return 'neutral'; // no dated activity to point to — never fabricate a date

  const daysSince = (now.getTime() - new Date(mostRecentPost).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince <= ACTIVE_THRESHOLD_DAYS) return 'active';
  if (daysSince <= WINDOW_THRESHOLD_DAYS) return 'window';
  return 'neutral';
}

/** Sort rank for the ranking comparator: active < window < neutral. */
export function recencyBucketRank(bucket: RecencyBucket): number {
  return bucket === 'active' ? 0 : bucket === 'window' ? 1 : 2;
}

/**
 * Pure rules behind the homepage snapshot alert check
 * (lib/homepage-snapshot/health.ts). No I/O, unit-tested.
 */

/** A snapshot older than this is reported. Refreshes run every 6 hours, so this is two missed refreshes. */
export const STALE_AFTER_MS = 12 * 60 * 60 * 1000;

/** While it stays stale, the staleness email repeats at most this often. */
export const STALE_REALERT_MS = 24 * 60 * 60 * 1000;

/** The most failed or refused runs one email lists; the rest wait for the next check. */
export const MAX_RUNS_PER_ALERT = 20;

export type AlertRun = {
  id: number;
  trigger: string;
  startedAt: string;
  outcome: 'refused' | 'failed';
  reason: string | null;
  durationMs: number;
};

/**
 * Staleness of the snapshot as the alert check sees it. `readError` is set
 * when the row could not be read at all, which counts as stale: the page is
 * then serving whatever it last rendered.
 */
export type StaleState = {
  computedAt: string | null;
  ageHours: number | null;
  readError: string | null;
};

/** Milliseconds since computedAt, or null when there is no usable timestamp. */
export function snapshotAgeMs(computedAt: string | null, now: Date): number | null {
  if (!computedAt) return null;
  const t = Date.parse(computedAt);
  if (Number.isNaN(t)) return null;
  return now.getTime() - t;
}

/** Missing, unreadable or older than STALE_AFTER_MS. */
export function isStale(computedAt: string | null, now: Date): boolean {
  const age = snapshotAgeMs(computedAt, now);
  return age === null || age > STALE_AFTER_MS;
}

/** A staleness email is due if none was ever sent, or the last one is older than STALE_REALERT_MS. */
export function staleAlertDue(lastSentAt: string | null, now: Date): boolean {
  if (!lastSentAt) return true;
  const t = Date.parse(lastSentAt);
  if (Number.isNaN(t)) return true;
  return now.getTime() - t >= STALE_REALERT_MS;
}

export function alertSubject(runs: AlertRun[], stale: StaleState | null): string {
  const parts: string[] = [];
  if (runs.length > 0) {
    const failed = runs.filter((r) => r.outcome === 'failed').length;
    const refused = runs.length - failed;
    const bits = [failed > 0 ? `${failed} failed` : null, refused > 0 ? `${refused} refused` : null].filter(Boolean);
    parts.push(`refresh ${bits.join(', ')}`);
  }
  if (stale) {
    if (stale.readError) parts.push('snapshot unreadable');
    else if (stale.ageHours === null) parts.push('no snapshot');
    else parts.push(`snapshot ${Math.floor(stale.ageHours)} h old`);
  }
  return `Homepage snapshot: ${parts.join(' · ')}`;
}

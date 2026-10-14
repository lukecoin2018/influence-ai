import 'server-only';
import { createElement } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail, maskEmail } from '@/lib/email/client';
import { HomepageSnapshotAlert } from '@/lib/email/templates/HomepageSnapshotAlert';
import {
  MAX_RUNS_PER_ALERT,
  alertSubject,
  isStale,
  snapshotAgeMs,
  staleAlertDue,
  type AlertRun,
  type StaleState,
} from './health-rules';

/**
 * The homepage snapshot alert check. Emails ADMIN_EMAIL when:
 *
 *   - a refresh attempt was refused or failed (homepage_snapshot_runs, every
 *     such row not yet alerted — one email lists them all); or
 *   - homepage_snapshot.computed_at is more than 12 hours old, or the row is
 *     missing or unreadable. Repeated at most every 24 hours while it stays
 *     that way (homepage_snapshot_alerts, kind 'stale').
 *
 * Called by POST /api/revalidate-home, which the database calls after every
 * scheduled or requested refresh (migration 0031), and by the daily Vercel
 * cron, which still runs if pg_cron does not. Skipped attempts (another
 * refresh held the lock) are not alerted on their own; if they keep the
 * snapshot from updating, the staleness rule reports it.
 *
 * ── Claim, send, release on failure ────────────────────────────────────────
 *
 * The opposite trade from the creator nudge: for an alert, a duplicate is
 * acceptable and silence is not. Rows are claimed first (alerted_at set with
 * `alerted_at IS NULL`, so two overlapping checks cannot both list a run), and
 * if the send fails the claim is released so the next check tries again.
 *
 * If the alert tables cannot be read (0031 not applied), the staleness email
 * is still sent, unclaimed: loud beats deduplicated.
 *
 * Never throws; every problem is in the returned summary and one
 * `[snapshot-health]` log line.
 */

export type HealthSummary = {
  snapshot: { computedAt: string | null; ageHours: number | null; stale: boolean; readError?: string };
  runsAlerted: number[];
  staleAlerted: boolean;
  email: 'sent' | 'failed' | 'not_needed';
  emailError?: string;
  errors: string[];
};

type RunRow = {
  id: number;
  trigger: string;
  started_at: string;
  outcome: 'refused' | 'failed';
  reason: string | null;
  duration_ms: number;
};

export async function checkHomepageSnapshotHealth(db: SupabaseClient, now: Date = new Date()): Promise<HealthSummary> {
  const nowIso = now.toISOString();
  const errors: string[] = [];

  // ── 1. The snapshot's age ────────────────────────────────────────────────
  let computedAt: string | null = null;
  let readError: string | null = null;
  const snap = await db.from('homepage_snapshot').select('computed_at').eq('id', true).maybeSingle();
  if (snap.error) readError = snap.error.message;
  else computedAt = (snap.data?.computed_at as string | undefined) ?? null;

  const ageMs = snapshotAgeMs(computedAt, now);
  const ageHours = ageMs === null ? null : ageMs / 3_600_000;
  const stale = readError !== null || isStale(computedAt, now);

  // ── 2. Refused or failed runs nobody has been told about ─────────────────
  let claimedRuns: AlertRun[] = [];
  const pending = await db
    .from('homepage_snapshot_runs')
    .select('id, trigger, started_at, outcome, reason, duration_ms')
    .in('outcome', ['refused', 'failed'])
    .is('alerted_at', null)
    .order('id', { ascending: true })
    .limit(MAX_RUNS_PER_ALERT);
  if (pending.error) {
    errors.push(`runs read failed: ${pending.error.message}`);
  } else if (pending.data && pending.data.length > 0) {
    const rows = pending.data as RunRow[];
    const claim = await db
      .from('homepage_snapshot_runs')
      .update({ alerted_at: nowIso })
      .in('id', rows.map((r) => r.id))
      .is('alerted_at', null)
      .select('id');
    if (claim.error) {
      errors.push(`runs claim failed: ${claim.error.message}`);
    } else {
      const claimedIds = new Set((claim.data ?? []).map((r: { id: number }) => r.id));
      claimedRuns = rows
        .filter((r) => claimedIds.has(r.id))
        .map((r) => ({
          id: r.id,
          trigger: r.trigger,
          startedAt: r.started_at,
          outcome: r.outcome,
          reason: r.reason,
          durationMs: r.duration_ms,
        }));
    }
  }

  // ── 3. Staleness, at most once per 24 hours ──────────────────────────────
  let staleClaimed = false;
  let stalePrevSentAt: string | null = null;
  let staleUnclaimed = false;
  if (stale) {
    const alertRow = await db.from('homepage_snapshot_alerts').select('last_sent_at').eq('kind', 'stale').maybeSingle();
    if (alertRow.error || !alertRow.data) {
      // No bookkeeping to dedupe against: send anyway.
      errors.push(`stale alert row unavailable: ${alertRow.error?.message ?? 'missing'}`);
      staleUnclaimed = true;
    } else {
      stalePrevSentAt = (alertRow.data.last_sent_at as string | null) ?? null;
      if (staleAlertDue(stalePrevSentAt, now)) {
        let claimQuery = db.from('homepage_snapshot_alerts').update({ last_sent_at: nowIso }).eq('kind', 'stale');
        claimQuery = stalePrevSentAt === null ? claimQuery.is('last_sent_at', null) : claimQuery.eq('last_sent_at', stalePrevSentAt);
        const claim = await claimQuery.select('kind');
        if (claim.error) errors.push(`stale alert claim failed: ${claim.error.message}`);
        else staleClaimed = (claim.data ?? []).length > 0;
      }
    }
  }

  const reportStale = staleClaimed || staleUnclaimed;
  const summaryBase = {
    snapshot: { computedAt, ageHours, stale, ...(readError ? { readError } : {}) },
    runsAlerted: claimedRuns.map((r) => r.id),
    staleAlerted: reportStale,
    errors,
  };

  if (claimedRuns.length === 0 && !reportStale) {
    if (errors.length > 0) console.error(`[snapshot-health] ${errors.join('; ')}`);
    return { ...summaryBase, email: 'not_needed' };
  }

  // ── 4. One email for everything claimed ──────────────────────────────────
  const staleState: StaleState | null = reportStale ? { computedAt, ageHours, readError } : null;
  const to = process.env.ADMIN_EMAIL;
  const result = to
    ? await sendEmail({
        to,
        subject: alertSubject(claimedRuns, staleState),
        react: createElement(HomepageSnapshotAlert, { runs: claimedRuns, stale: staleState }),
        tags: [{ name: 'type', value: 'homepage_snapshot_alert' }],
      })
    : ({ ok: false, error: 'ADMIN_EMAIL unset' } as const);

  if (result.ok) {
    console.log(
      `[snapshot-health] alert sent to ${maskEmail(to!)}: runs ${claimedRuns.map((r) => r.id).join(',') || 'none'}` +
        (reportStale ? `, stale (age ${ageHours === null ? 'unknown' : ageHours.toFixed(1) + ' h'})` : ''),
    );
    if (errors.length > 0) console.error(`[snapshot-health] ${errors.join('; ')}`);
    return { ...summaryBase, email: 'sent' };
  }

  // ── 5. Release the claims so the next check retries ──────────────────────
  if (claimedRuns.length > 0) {
    const release = await db
      .from('homepage_snapshot_runs')
      .update({ alerted_at: null })
      .in('id', claimedRuns.map((r) => r.id))
      .eq('alerted_at', nowIso);
    if (release.error) errors.push(`runs release failed: ${release.error.message}`);
  }
  if (staleClaimed) {
    const release = await db
      .from('homepage_snapshot_alerts')
      .update({ last_sent_at: stalePrevSentAt })
      .eq('kind', 'stale')
      .eq('last_sent_at', nowIso);
    if (release.error) errors.push(`stale alert release failed: ${release.error.message}`);
  }
  console.error(`[snapshot-health] alert NOT sent (${result.error}); claims released for the next check. ${errors.join('; ')}`);
  return { ...summaryBase, email: 'failed', emailError: result.error };
}

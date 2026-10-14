import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { alertSubject, isStale, staleAlertDue, STALE_AFTER_MS } from './health-rules';

/**
 * The alert check against an in-memory double of the three tables it touches.
 *
 * What has to hold: a refused or failed run is emailed exactly once when the
 * send works, and stays claimable when it does not; the staleness email goes
 * at most once per 24 hours; and nothing is sent when all is well.
 */

const sendEmail = vi.fn();

vi.mock('@/lib/email/client', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
  maskEmail: (a: string) => `${a[0]}***`,
}));

const { checkHomepageSnapshotHealth } = await import('./health');

type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

/** Just enough of the supabase-js builder for health.ts's chains. */
function fakeDb(tables: Record<string, Row[]>) {
  function builder(table: string) {
    const filters: Filter[] = [];
    let patch: Row | null = null;
    let limit = Infinity;
    let wantsRows = false;
    const run = () => {
      const rows = (tables[table] ??= []);
      const hit = rows.filter((r) => filters.every((f) => f(r))).slice(0, limit);
      if (patch) for (const r of hit) Object.assign(r, patch);
      return hit.map((r) => ({ ...r }));
    };
    const b = {
      select() { wantsRows = true; return b; },
      update(p: Row) { patch = p; return b; },
      eq(c: string, v: unknown) { filters.push((r) => r[c] === v); return b; },
      is(c: string, v: unknown) { filters.push((r) => (r[c] ?? null) === v); return b; },
      in(c: string, vs: unknown[]) { filters.push((r) => vs.includes(r[c])); return b; },
      order() { return b; },
      limit(n: number) { limit = n; return b; },
      maybeSingle() { const rows = run(); return Promise.resolve({ data: rows[0] ?? null, error: null }); },
      then(resolve: (v: { data: Row[] | null; error: null }) => unknown) {
        const rows = run();
        return Promise.resolve({ data: wantsRows || !patch ? rows : null, error: null }).then(resolve);
      },
    };
    return b;
  }
  return { from: (t: string) => builder(t) } as unknown as SupabaseClient;
}

const NOW = new Date('2026-10-14T18:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function freshTables() {
  return {
    homepage_snapshot: [{ id: true, computed_at: hoursAgo(1) }] as Row[],
    homepage_snapshot_runs: [] as Row[],
    homepage_snapshot_alerts: [{ kind: 'stale', last_sent_at: null }] as Row[],
  };
}

function failedRun(id: number, outcome = 'failed') {
  return { id, trigger: 'cron', started_at: hoursAgo(2), outcome, reason: '57014: canceling statement', duration_ms: 55000, alerted_at: null };
}

beforeEach(() => {
  sendEmail.mockReset();
  process.env.ADMIN_EMAIL = 'admin@example.com';
});

describe('checkHomepageSnapshotHealth', () => {
  it('sends nothing when the snapshot is fresh and no run failed', async () => {
    const t = freshTables();
    const s = await checkHomepageSnapshotHealth(fakeDb(t), NOW);
    expect(s.email).toBe('not_needed');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('emails refused and failed runs once, then marks them alerted', async () => {
    const t = freshTables();
    t.homepage_snapshot_runs.push(failedRun(1), failedRun(2, 'refused'), { ...failedRun(3), outcome: 'ok' });
    sendEmail.mockResolvedValue({ ok: true, id: 'e1' });

    const first = await checkHomepageSnapshotHealth(fakeDb(t), NOW);
    expect(first.email).toBe('sent');
    expect(first.runsAlerted).toEqual([1, 2]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].subject).toBe('Homepage snapshot: refresh 1 failed, 1 refused');

    const second = await checkHomepageSnapshotHealth(fakeDb(t), NOW);
    expect(second.email).toBe('not_needed');
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('releases the claim when the send fails, so the next check retries', async () => {
    const t = freshTables();
    t.homepage_snapshot_runs.push(failedRun(7));
    sendEmail.mockResolvedValueOnce({ ok: false, error: 'resend down' });

    const first = await checkHomepageSnapshotHealth(fakeDb(t), NOW);
    expect(first.email).toBe('failed');
    expect(t.homepage_snapshot_runs[0].alerted_at).toBeNull();

    sendEmail.mockResolvedValueOnce({ ok: true, id: 'e2' });
    const second = await checkHomepageSnapshotHealth(fakeDb(t), NOW);
    expect(second.email).toBe('sent');
    expect(second.runsAlerted).toEqual([7]);
  });

  it('treats ADMIN_EMAIL unset as a failed send and keeps the run pending', async () => {
    delete process.env.ADMIN_EMAIL;
    const t = freshTables();
    t.homepage_snapshot_runs.push(failedRun(9));
    const s = await checkHomepageSnapshotHealth(fakeDb(t), NOW);
    expect(s.email).toBe('failed');
    expect(s.emailError).toBe('ADMIN_EMAIL unset');
    expect(t.homepage_snapshot_runs[0].alerted_at).toBeNull();
  });

  it('emails a stale snapshot at most once per 24 hours', async () => {
    const t = freshTables();
    t.homepage_snapshot[0].computed_at = hoursAgo(13);
    sendEmail.mockResolvedValue({ ok: true, id: 'e3' });

    const first = await checkHomepageSnapshotHealth(fakeDb(t), NOW);
    expect(first.staleAlerted).toBe(true);
    expect(sendEmail.mock.calls[0][0].subject).toBe('Homepage snapshot: snapshot 13 h old');

    const sameDay = await checkHomepageSnapshotHealth(fakeDb(t), new Date(NOW.getTime() + 6 * 3_600_000));
    expect(sameDay.email).toBe('not_needed');

    const nextDay = await checkHomepageSnapshotHealth(fakeDb(t), new Date(NOW.getTime() + 25 * 3_600_000));
    expect(nextDay.staleAlerted).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('counts a missing snapshot row as stale', async () => {
    const t = freshTables();
    t.homepage_snapshot = [];
    sendEmail.mockResolvedValue({ ok: true, id: 'e4' });
    const s = await checkHomepageSnapshotHealth(fakeDb(t), NOW);
    expect(s.snapshot.stale).toBe(true);
    expect(sendEmail.mock.calls[0][0].subject).toBe('Homepage snapshot: no snapshot');
  });

  it('restores the previous stale timestamp when that send fails', async () => {
    const t = freshTables();
    t.homepage_snapshot[0].computed_at = hoursAgo(30);
    const previous = hoursAgo(26);
    t.homepage_snapshot_alerts[0].last_sent_at = previous;
    sendEmail.mockResolvedValueOnce({ ok: false, error: 'resend down' });
    await checkHomepageSnapshotHealth(fakeDb(t), NOW);
    expect(t.homepage_snapshot_alerts[0].last_sent_at).toBe(previous);
  });
});

describe('health rules', () => {
  it('is stale past 12 hours, or with no timestamp', () => {
    expect(isStale(new Date(NOW.getTime() - STALE_AFTER_MS + 1000).toISOString(), NOW)).toBe(false);
    expect(isStale(new Date(NOW.getTime() - STALE_AFTER_MS - 1000).toISOString(), NOW)).toBe(true);
    expect(isStale(null, NOW)).toBe(true);
  });

  it('re-alerts staleness after 24 hours', () => {
    expect(staleAlertDue(null, NOW)).toBe(true);
    expect(staleAlertDue(hoursAgo(23), NOW)).toBe(false);
    expect(staleAlertDue(hoursAgo(24), NOW)).toBe(true);
  });

  it('names both problems in one subject', () => {
    expect(
      alertSubject(
        [{ id: 1, trigger: 'cron', startedAt: hoursAgo(1), outcome: 'failed', reason: null, durationMs: 1 }],
        { computedAt: hoursAgo(14), ageHours: 14.2, readError: null },
      ),
    ).toBe('Homepage snapshot: refresh 1 failed · snapshot 14 h old');
  });
});

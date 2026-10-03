import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createProgressRecorder,
  isStale,
  parseRunRequest,
  pipelineEnabled,
  startRun,
  STALE_AFTER_MS,
  toStoredResult,
} from './pipeline-runs';

/**
 * The lock, the stale flag, the request validator and the progress throttle.
 * The Supabase client is a double that scripts one answer per operation and
 * records what was sent; the real lock lives in the database (0023's partial
 * unique index), so what is tested here is that a 23505 from it is read as
 * "already running" and answered with the row that holds the lock.
 */

type Answer = { data?: unknown; error?: { code?: string; message: string } | null };

function fakeAdmin(script: { insert?: Answer; running?: Answer; update?: Answer }) {
  const calls: { op: string; payload?: unknown }[] = [];
  let op: 'insert' | 'select' | 'update' = 'select';
  const chain: Record<string, unknown> = {
    insert(payload: unknown) { op = 'insert'; calls.push({ op: 'insert', payload }); return chain; },
    update(payload: unknown) { op = 'update'; calls.push({ op: 'update', payload }); return chain; },
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(script.insert ?? { data: null, error: null }),
    maybeSingle: () => Promise.resolve(script.running ?? { data: null, error: null }),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(op === 'update' ? (script.update ?? { data: null, error: null }) : { data: null, error: null }).then(resolve),
  };
  const admin = { from: () => chain } as unknown as SupabaseClient;
  return { admin, calls };
}

const RUNNING_ROW = {
  id: 'run-1', step: 'seed', status: 'running', started_at: '2026-10-03T10:00:00.000Z',
  finished_at: null, duration_ms: null, options: null, result: null, error: null, progress: 'Scanning...', triggered_by: 'u1',
};

describe('isStale', () => {
  const now = Date.parse('2026-10-03T12:00:00.000Z');
  it('is false inside the 20-minute window', () => {
    expect(isStale(new Date(now - STALE_AFTER_MS + 1000).toISOString(), now)).toBe(false);
    expect(isStale(new Date(now).toISOString(), now)).toBe(false);
  });
  it('is true once the run is older than 20 minutes', () => {
    expect(isStale(new Date(now - STALE_AFTER_MS - 1000).toISOString(), now)).toBe(true);
  });
  it('treats an unparseable timestamp as not stale rather than clearable', () => {
    expect(isStale('not a date', now)).toBe(false);
  });
});

describe('pipelineEnabled', () => {
  it('is only true for the literal string true', () => {
    expect(pipelineEnabled({ PIPELINE_ENABLED: 'true' })).toBe(true);
    expect(pipelineEnabled({ PIPELINE_ENABLED: '1' })).toBe(false);
    expect(pipelineEnabled({ PIPELINE_ENABLED: 'TRUE' })).toBe(false);
    expect(pipelineEnabled({})).toBe(false);
  });
});

describe('parseRunRequest', () => {
  it('accepts the three runnable steps with no options', () => {
    for (const step of ['seed', 'prepass', 'refresh']) {
      expect(parseRunRequest({ step })).toEqual({ step, options: {} });
    }
  });
  it('rejects classify in this release with its own reason', () => {
    expect(parseRunRequest({ step: 'classify' })).toMatchObject({ reason: 'step_not_available' });
  });
  it('rejects unknown steps and bodies', () => {
    expect(parseRunRequest({ step: 'drop_tables' })).toMatchObject({ reason: 'invalid_step' });
    expect(parseRunRequest(null)).toMatchObject({ reason: 'invalid_step' });
    expect(parseRunRequest('seed')).toMatchObject({ reason: 'invalid_step' });
  });
  it('accepts dryRun for refresh only, and only as a boolean', () => {
    expect(parseRunRequest({ step: 'refresh', options: { dryRun: true } })).toEqual({ step: 'refresh', options: { dryRun: true } });
    expect(parseRunRequest({ step: 'refresh', options: { dryRun: 'yes' } })).toMatchObject({ reason: 'invalid_options' });
    expect(parseRunRequest({ step: 'seed', options: { dryRun: true } })).toMatchObject({ reason: 'invalid_options' });
    expect(parseRunRequest({ step: 'refresh', options: { brand: 'Shein' } })).toMatchObject({ reason: 'invalid_options' });
    expect(parseRunRequest({ step: 'refresh', options: [] })).toMatchObject({ reason: 'invalid_options' });
  });
});

describe('startRun — the lock', () => {
  it('returns the inserted row when the index accepts it', async () => {
    const { admin, calls } = fakeAdmin({ insert: { data: RUNNING_ROW, error: null } });
    const result = await startRun(admin, { step: 'seed', options: {}, triggeredBy: 'u1' });
    expect(result).toEqual({ run: RUNNING_ROW });
    expect(calls[0]).toEqual({ op: 'insert', payload: { step: 'seed', status: 'running', options: {}, triggered_by: 'u1' } });
  });

  it('reads a 23505 as "already running" and returns the row holding the lock', async () => {
    const { admin } = fakeAdmin({
      insert: { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "pipeline_runs_one_running"' } },
      running: { data: RUNNING_ROW, error: null },
    });
    const result = await startRun(admin, { step: 'prepass', options: {}, triggeredBy: 'u1' });
    expect(result).toEqual({ conflict: RUNNING_ROW });
  });

  it('returns a null conflict when the blocking run finished in between', async () => {
    const { admin } = fakeAdmin({
      insert: { data: null, error: { code: '23505', message: 'duplicate key' } },
      running: { data: null, error: null },
    });
    expect(await startRun(admin, { step: 'prepass', options: {}, triggeredBy: 'u1' })).toEqual({ conflict: null });
  });

  it('surfaces any other insert error as an error, not a conflict', async () => {
    const { admin } = fakeAdmin({ insert: { data: null, error: { code: '42P01', message: 'relation "pipeline_runs" does not exist' } } });
    expect(await startRun(admin, { step: 'seed', options: {}, triggeredBy: 'u1' })).toEqual({
      error: { code: '42P01', message: 'relation "pipeline_runs" does not exist' },
    });
  });
});

describe('toStoredResult', () => {
  it("drops refresh's rows array and keeps the counts", () => {
    expect(toStoredResult('refresh', { rows: [{ a: 1 }], rowsComputed: 1, rowsWritten: 1 })).toEqual({ rowsComputed: 1, rowsWritten: 1 });
  });
  it('stores other steps as-is', () => {
    expect(toStoredResult('seed', { aliasesFound: 3, rowsUpserted: 3, newAliases: 1 })).toEqual({ aliasesFound: 3, rowsUpserted: 3, newAliases: 1 });
  });
});

describe('createProgressRecorder — throttle', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
  afterEach(() => { vi.useRealTimers(); });

  function recorder() {
    const { admin, calls } = fakeAdmin({});
    const rec = createProgressRecorder(admin, 'run-1');
    const written = () => calls.filter((c) => c.op === 'update').map((c) => (c.payload as { progress: string }).progress);
    return { rec, written };
  }

  it('writes the first message immediately and drops transient counters', async () => {
    const { rec, written } = recorder();
    rec.onProgress('Scanning creator_posts.detected_brands...');
    rec.onProgress('  500/23697', true);
    await rec.flush();
    expect(written()).toEqual(['Scanning creator_posts.detected_brands...']);
  });

  it('coalesces a burst into at most one write per 2 seconds, keeping the latest', async () => {
    const { rec, written } = recorder();
    rec.onProgress('one');
    rec.onProgress('two');
    rec.onProgress('three');
    await vi.advanceTimersByTimeAsync(0); // the write itself is queued on a promise chain
    expect(written()).toEqual(['one']);
    await vi.advanceTimersByTimeAsync(1999);
    expect(written()).toEqual(['one']);
    await vi.advanceTimersByTimeAsync(1);
    expect(written()).toEqual(['one', 'three']);
  });

  it('flush writes the pending message and does not rewrite an unchanged one', async () => {
    const { rec, written } = recorder();
    rec.onProgress('one');
    rec.onProgress('two');
    await rec.flush();
    expect(written()).toEqual(['one', 'two']);
    await rec.flush();
    expect(written()).toEqual(['one', 'two']);
    expect(rec.latest()).toBe('two');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createProgressRecorder,
  formatBatchLine,
  isStale,
  parseRunRequest,
  pipelineEnabled,
  anthropicApiKey,
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

function fakeAdmin(script: { insert?: Answer; running?: Answer; update?: Answer | Answer[] }) {
  const calls: { op: string; payload?: unknown }[] = [];
  let op: 'insert' | 'select' | 'update' = 'select';
  const updateAnswers = Array.isArray(script.update) ? [...script.update] : null;
  const chain: Record<string, unknown> = {
    insert(payload: unknown) { op = 'insert'; calls.push({ op: 'insert', payload }); return chain; },
    update(payload: unknown) { op = 'update'; calls.push({ op: 'update', payload }); return chain; },
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(script.insert ?? { data: null, error: null }),
    maybeSingle: () => Promise.resolve(script.running ?? { data: null, error: null }),
    then: (resolve: (v: unknown) => unknown) => {
      let answer: Answer = { data: null, error: null };
      if (op === 'update') {
        if (updateAnswers) answer = updateAnswers.shift() ?? { data: null, error: null };
        else if (script.update && !Array.isArray(script.update)) answer = script.update;
      }
      return Promise.resolve(answer).then(resolve);
    },
  };
  const admin = { from: () => chain } as unknown as SupabaseClient;
  return { admin, calls };
}

const RUNNING_ROW = {
  id: 'run-1', step: 'seed', status: 'running', started_at: '2026-10-03T10:00:00.000Z',
  finished_at: null, duration_ms: null, options: null, result: null, error: null, progress: 'Scanning...', triggered_by: 'u1',
};

describe('isStale — heartbeat-based', () => {
  const now = Date.parse('2026-10-03T12:00:00.000Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('is false inside the 20-minute window measured from started_at when there is no heartbeat', () => {
    expect(isStale({ started_at: ago(STALE_AFTER_MS - 1000) }, now)).toBe(false);
    expect(isStale({ started_at: ago(0), heartbeat_at: null }, now)).toBe(false);
  });
  it('is true once started_at is older than 20 minutes and nothing has heartbeat', () => {
    expect(isStale({ started_at: ago(STALE_AFTER_MS + 1000) }, now)).toBe(true);
    expect(isStale({ started_at: ago(STALE_AFTER_MS + 1000), heartbeat_at: null }, now)).toBe(true);
  });
  it('a long run that is still writing progress is never stale — a recent heartbeat beats an old start', () => {
    expect(isStale({ started_at: ago(3 * 60 * 60 * 1000), heartbeat_at: ago(30 * 1000) }, now)).toBe(false);
    expect(isStale({ started_at: ago(3 * 60 * 60 * 1000), heartbeat_at: ago(STALE_AFTER_MS - 1000) }, now)).toBe(false);
  });
  it('a run whose heartbeat went quiet becomes stale 20 minutes after the last write', () => {
    expect(isStale({ started_at: ago(60 * 60 * 1000), heartbeat_at: ago(STALE_AFTER_MS + 1000) }, now)).toBe(true);
  });
  it('treats an unparseable timestamp as not stale rather than clearable', () => {
    expect(isStale({ started_at: 'not a date' }, now)).toBe(false);
  });
});

describe('pipelineEnabled / anthropicApiKey', () => {
  it('is only true for the literal string true', () => {
    expect(pipelineEnabled({ PIPELINE_ENABLED: 'true' })).toBe(true);
    expect(pipelineEnabled({ PIPELINE_ENABLED: '1' })).toBe(false);
    expect(pipelineEnabled({ PIPELINE_ENABLED: 'TRUE' })).toBe(false);
    expect(pipelineEnabled({})).toBe(false);
  });
  it('reads a trimmed, non-empty ANTHROPIC_API_KEY, else null', () => {
    expect(anthropicApiKey({ ANTHROPIC_API_KEY: ' sk-x ' })).toBe('sk-x');
    expect(anthropicApiKey({ ANTHROPIC_API_KEY: '' })).toBeNull();
    expect(anthropicApiKey({ ANTHROPIC_API_KEY: '   ' })).toBeNull();
    expect(anthropicApiKey({})).toBeNull();
  });
});

describe('parseRunRequest', () => {
  it('accepts seed, prepass and refresh with no options', () => {
    for (const step of ['seed', 'prepass', 'refresh']) {
      expect(parseRunRequest({ step })).toEqual({ step, options: {} });
    }
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

  describe('classify options', () => {
    it('defaults to minCount 2, limit 200, preview false', () => {
      expect(parseRunRequest({ step: 'classify' })).toEqual({ step: 'classify', options: { minCount: 2, limit: 200, preview: false } });
    });
    it('accepts values inside the bounds', () => {
      expect(parseRunRequest({ step: 'classify', options: { minCount: 1, limit: 5, preview: true } }))
        .toEqual({ step: 'classify', options: { minCount: 1, limit: 5, preview: true } });
      expect(parseRunRequest({ step: 'classify', options: { minCount: 10, limit: 1000 } }))
        .toEqual({ step: 'classify', options: { minCount: 10, limit: 1000, preview: false } });
    });
    it('rejects minCount outside 1..10 or non-integer', () => {
      for (const minCount of [0, 11, -1, 2.5, '2', null]) {
        expect(parseRunRequest({ step: 'classify', options: { minCount } }), String(minCount)).toMatchObject({ reason: 'invalid_options' });
      }
    });
    it('rejects limit outside 1..1000 or non-integer — there is no unlimited option', () => {
      for (const limit of [0, 1001, 50000, 1.5, '200', null, Infinity]) {
        expect(parseRunRequest({ step: 'classify', options: { limit } }), String(limit)).toMatchObject({ reason: 'invalid_options' });
      }
    });
    it('rejects a non-boolean preview and classify options on other steps', () => {
      expect(parseRunRequest({ step: 'classify', options: { preview: 'yes' } })).toMatchObject({ reason: 'invalid_options' });
      expect(parseRunRequest({ step: 'classify', options: { dryRun: true } })).toMatchObject({ reason: 'invalid_options' });
      expect(parseRunRequest({ step: 'seed', options: { minCount: 1 } })).toMatchObject({ reason: 'invalid_options' });
      expect(parseRunRequest({ step: 'refresh', options: { limit: 5 } })).toMatchObject({ reason: 'invalid_options' });
    });
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

describe('toStoredResult / formatBatchLine', () => {
  it("drops refresh's rows array and keeps the counts", () => {
    expect(toStoredResult('refresh', { rows: [{ a: 1 }], rowsComputed: 1, rowsWritten: 1 })).toEqual({ rowsComputed: 1, rowsWritten: 1 });
  });
  it('stores other steps as-is', () => {
    expect(toStoredResult('seed', { aliasesFound: 3, rowsUpserted: 3, newAliases: 1 })).toEqual({ aliasesFound: 3, rowsUpserted: 3, newAliases: 1 });
  });
  it('formats the one classify progress line per batch', () => {
    expect(formatBatchLine({ index: 3, total: 10, aliases: 50, classified: 48 })).toBe('batch 3 of 10, 50 aliases, 48 classified');
    expect(formatBatchLine({ index: 1, total: 1, aliases: 5, classified: 0, error: 'Claude API error: 529' }))
      .toBe('batch 1 of 1, 5 aliases, 0 classified (failed: Claude API error: 529)');
  });
});

describe('createProgressRecorder — throttle and heartbeat', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(Date.parse('2026-10-03T12:00:00.000Z')); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  function recorder(update?: Answer | Answer[]) {
    const { admin, calls } = fakeAdmin({ update });
    const rec = createProgressRecorder(admin, 'run-1');
    const updates = () => calls.filter((c) => c.op === 'update').map((c) => c.payload as Record<string, unknown>);
    return { rec, updates };
  }

  it('writes the first message immediately with a heartbeat, and drops transient counters', async () => {
    const { rec, updates } = recorder();
    rec.onProgress('Scanning creator_posts.detected_brands...');
    rec.onProgress('  500/23697', true);
    await rec.flush();
    expect(updates()).toEqual([{ progress: 'Scanning creator_posts.detected_brands...', heartbeat_at: '2026-10-03T12:00:00.000Z' }]);
  });

  it('coalesces a burst into at most one write per 2 seconds, keeping the latest, each write stamping the heartbeat', async () => {
    const { rec, updates } = recorder();
    rec.onProgress('one');
    rec.onProgress('two');
    rec.onProgress('three');
    await vi.advanceTimersByTimeAsync(0); // the write itself is queued on a promise chain
    expect(updates().map((u) => u.progress)).toEqual(['one']);
    await vi.advanceTimersByTimeAsync(1999);
    expect(updates().map((u) => u.progress)).toEqual(['one']);
    await vi.advanceTimersByTimeAsync(1);
    expect(updates().map((u) => u.progress)).toEqual(['one', 'three']);
    expect(updates()[1].heartbeat_at).toBe('2026-10-03T12:00:02.000Z');
  });

  it('flush writes the pending message and does not rewrite an unchanged one', async () => {
    const { rec, updates } = recorder();
    rec.onProgress('one');
    rec.onProgress('two');
    await rec.flush();
    expect(updates().map((u) => u.progress)).toEqual(['one', 'two']);
    await rec.flush();
    expect(updates().map((u) => u.progress)).toEqual(['one', 'two']);
    expect(rec.latest()).toBe('two');
  });

  it('falls back to progress-only writes when heartbeat_at is missing (0024 not applied)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rec, updates } = recorder([
      { data: null, error: { code: 'PGRST204', message: "Could not find the 'heartbeat_at' column of 'pipeline_runs' in the schema cache" } },
      { data: null, error: null },
      { data: null, error: null },
    ]);
    rec.onProgress('one');
    await rec.flush();
    await vi.advanceTimersByTimeAsync(2000);
    rec.onProgress('two');
    await rec.flush();
    const sent = updates();
    expect(sent[0]).toEqual({ progress: 'one', heartbeat_at: '2026-10-03T12:00:00.000Z' });
    expect(sent[1]).toEqual({ progress: 'one' });
    expect(sent[2]).toEqual({ progress: 'two' });
  });
});

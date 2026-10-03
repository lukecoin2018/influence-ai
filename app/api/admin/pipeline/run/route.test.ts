import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * POST /api/admin/pipeline/run end to end at the module boundary: the owner
 * gate, the PIPELINE_ENABLED gate, request validation, classify's API-key
 * gate, the lock's 409, and that a successful start hands the work to after()
 * and answers 202 at once.
 */

const requireOwnerApi = vi.fn();
const after = vi.fn();
const executeRun = vi.fn();

type Answer = { data?: unknown; error?: { code?: string; message: string } | null };
let insertAnswer: Answer = { data: null, error: null };
let runningAnswer: Answer = { data: null, error: null };
const inserted: unknown[] = [];

function from() {
  const chain: Record<string, unknown> = {
    insert(payload: unknown) { inserted.push(payload); return chain; },
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(insertAnswer),
    maybeSingle: () => Promise.resolve(runningAnswer),
  };
  return chain;
}

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: (...a: unknown[]) => after(...a) };
});
vi.mock('@/lib/auth/api-guards', () => ({ requireOwnerApi: () => requireOwnerApi() }));
vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: () => ({ from }) }));
vi.mock('@/lib/admin/pipeline-runs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/admin/pipeline-runs')>();
  return { ...actual, executeRun: (...a: unknown[]) => executeRun(...a) };
});

const { POST } = await import('./route');

function post(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/admin/pipeline/run', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
    {} as never,
  );
}

const RUNNING_ROW = {
  id: 'run-1', step: 'seed', status: 'running', started_at: '2026-10-03T10:00:00.000Z',
  finished_at: null, duration_ms: null, options: {}, result: null, error: null, progress: null, triggered_by: 'owner',
};

describe('POST /api/admin/pipeline/run', () => {
  beforeEach(() => {
    vi.stubEnv('PIPELINE_ENABLED', 'true');
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test');
    requireOwnerApi.mockResolvedValue({ userId: 'owner' });
    insertAnswer = { data: RUNNING_ROW, error: null };
    runningAnswer = { data: null, error: null };
    inserted.length = 0;
    after.mockReset();
    executeRun.mockReset();
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('answers 503 with the disabled message when PIPELINE_ENABLED is not true, before touching the database', async () => {
    vi.stubEnv('PIPELINE_ENABLED', '');
    const res = await post({ step: 'seed' });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ reason: 'pipeline_disabled' });
    expect(inserted).toEqual([]);
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('lets the owner gate answer first', async () => {
    const { NextResponse } = await import('next/server');
    requireOwnerApi.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    const res = await post({ step: 'seed' });
    expect(res.status).toBe(403);
    expect(inserted).toEqual([]);
  });

  it('answers 400 for unknown steps and out-of-range classify options', async () => {
    expect((await post({ step: 'nope' })).status).toBe(400);
    const res = await post({ step: 'classify', options: { limit: 5000 } });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ reason: 'invalid_options' });
    expect(inserted).toEqual([]);
  });

  it('inserts the running row, schedules the work with after(), and answers 202 with the run id', async () => {
    const res = await post({ step: 'refresh', options: { dryRun: true } });
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ runId: 'run-1', run: { id: 'run-1' } });
    expect(inserted).toEqual([{ step: 'refresh', status: 'running', options: { dryRun: true }, triggered_by: 'owner' }]);
    expect(after).toHaveBeenCalledTimes(1);
    // The scheduled task runs the step; executeRun is what it calls.
    (after.mock.calls[0][0] as () => unknown)();
    expect(executeRun).toHaveBeenCalledWith(expect.anything(), RUNNING_ROW);
  });

  it('starts classify with its defaults filled in and stored on the row', async () => {
    const res = await post({ step: 'classify', options: { preview: true } });
    expect(res.status).toBe(202);
    expect(inserted).toEqual([{ step: 'classify', status: 'running', options: { minCount: 2, limit: 200, preview: true }, triggered_by: 'owner' }]);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('answers 503 anthropic_key_missing for classify when the server has no key, without taking the lock', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const res = await post({ step: 'classify' });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ reason: 'anthropic_key_missing' });
    expect(inserted).toEqual([]);
    expect(after).not.toHaveBeenCalled();
  });

  it('does not require the key for the other steps', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    expect((await post({ step: 'prepass' })).status).toBe(202);
  });

  it('answers 409 with the blocking run when the lock rejects the insert — a double-click starts nothing', async () => {
    insertAnswer = { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "pipeline_runs_one_running"' } };
    runningAnswer = { data: RUNNING_ROW, error: null };
    const res = await post({ step: 'prepass' });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ reason: 'run_in_progress', running: { id: 'run-1', step: 'seed' } });
    expect(after).not.toHaveBeenCalled();
  });

  it('names the missing migration when the table does not exist', async () => {
    insertAnswer = { data: null, error: { code: '42P01', message: 'relation "public.pipeline_runs" does not exist' } };
    const res = await post({ step: 'seed' });
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ reason: 'pipeline_runs_missing' });
  });
});

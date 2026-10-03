import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProgressFn } from '@/lib/pipeline/types';
import { runSeed } from '@/lib/pipeline/seed';
import { runPrepass } from '@/lib/pipeline/prepass';
import { runRefresh } from '@/lib/pipeline/refresh';

/**
 * Everything the three /api/admin/pipeline routes share: the step list, the
 * run-row shape, the enabled gate, the lock-aware insert, the throttled
 * progress writer and the step executor.
 *
 * This lives in lib/admin, not lib/pipeline, on purpose: lib/pipeline must
 * stay free of Next imports (lib/pipeline/no-next-imports.test.ts) because the
 * CLI wrappers run it under plain tsx. This module is the Next-side glue.
 *
 * ── THE LOCK ───────────────────────────────────────────────────────────────
 *
 * pipeline_runs (0023) has a partial unique index allowing one row with
 * status = 'running' across all steps. startRun() inserts first and reads a
 * 23505 as "already running", so two clicks race at the database, not in
 * JavaScript, and the loser is told what is blocking it.
 *
 * ── PROGRESS ───────────────────────────────────────────────────────────────
 *
 * Progress never goes to the console — the classify dump already showed how
 * fast next-30001.log fills. Non-transient messages are written to the row's
 * `progress` column at most once every PROGRESS_THROTTLE_MS; transient
 * counters ("  500/23697") are dropped. flush() writes whatever is pending at
 * the end so the final line is never lost to the throttle.
 */

export const PIPELINE_STEPS = ['seed', 'prepass', 'classify', 'refresh'] as const;
export type PipelineStep = (typeof PIPELINE_STEPS)[number];

/** Steps the run route accepts in this release. classify arrives in the next one. */
export const RUNNABLE_STEPS: readonly PipelineStep[] = ['seed', 'prepass', 'refresh'];

export type RunStatus = 'running' | 'done' | 'failed' | 'abandoned';

export type PipelineRun = {
  id: string;
  step: PipelineStep;
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  options: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  progress: string | null;
  triggered_by: string | null;
};

export type RunOptions = { dryRun?: boolean };

export const STALE_AFTER_MS = 20 * 60 * 1000;
export const PROGRESS_THROTTLE_MS = 2000;

export const RUN_SELECT = 'id, step, status, started_at, finished_at, duration_ms, options, result, error, progress, triggered_by';

/** A running row older than STALE_AFTER_MS is presumed orphaned by a process restart. */
export function isStale(startedAt: string, now: number = Date.now()): boolean {
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return false;
  return now - started > STALE_AFTER_MS;
}

export function pipelineEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.PIPELINE_ENABLED === 'true';
}

export const PIPELINE_DISABLED_MESSAGE =
  'The pipeline is disabled on this host. Set PIPELINE_ENABLED=true in the environment of the server that should run it (the VPS), then restart it.';

export function pipelineDisabledResponse(): NextResponse {
  return NextResponse.json({ error: PIPELINE_DISABLED_MESSAGE, reason: 'pipeline_disabled' }, { status: 503 });
}

/** PostgREST's "relation does not exist" (42P01) or schema-cache miss (PGRST205): migration 0023 not applied. */
export function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205' || /pipeline_runs/.test(error.message ?? '') && /not (exist|find)/.test(error.message ?? '');
}

export const MIGRATION_MISSING_MESSAGE = 'pipeline_runs does not exist — apply supabase/migrations/0023_pipeline_runs.sql.';

export type ParsedRunRequest = { step: PipelineStep; options: RunOptions } | { error: string; reason: string };

/** Validates a POST /run body. Unknown steps and unknown option keys are 400s, never ignored. */
export function parseRunRequest(body: unknown): ParsedRunRequest {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const step = record.step;
  if (typeof step !== 'string' || !(PIPELINE_STEPS as readonly string[]).includes(step)) {
    return { error: `step must be one of ${PIPELINE_STEPS.join(', ')}`, reason: 'invalid_step' };
  }
  if (!RUNNABLE_STEPS.includes(step as PipelineStep)) {
    return { error: 'classify is not runnable from the admin page yet — coming in the next release.', reason: 'step_not_available' };
  }
  const rawOptions = record.options ?? {};
  if (typeof rawOptions !== 'object' || rawOptions === null || Array.isArray(rawOptions)) {
    return { error: 'options must be an object', reason: 'invalid_options' };
  }
  const options: RunOptions = {};
  for (const [key, value] of Object.entries(rawOptions as Record<string, unknown>)) {
    if (key === 'dryRun' && step === 'refresh') {
      if (typeof value !== 'boolean') return { error: 'options.dryRun must be a boolean', reason: 'invalid_options' };
      options.dryRun = value;
      continue;
    }
    return { error: `options.${key} is not accepted for step ${step}`, reason: 'invalid_options' };
  }
  return { step: step as PipelineStep, options };
}

export type StartRunResult =
  | { run: PipelineRun }
  | { conflict: PipelineRun | null }
  | { error: { code?: string; message: string } };

/**
 * Inserts the 'running' row. A 23505 from the partial unique index means
 * another run holds the lock; the current running row is fetched so the
 * caller can say what is blocking (null if it finished in between).
 */
export async function startRun(
  admin: SupabaseClient,
  input: { step: PipelineStep; options: RunOptions; triggeredBy: string },
): Promise<StartRunResult> {
  const { data, error } = await admin
    .from('pipeline_runs')
    .insert({ step: input.step, status: 'running', options: input.options, triggered_by: input.triggeredBy })
    .select(RUN_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') {
      return { conflict: await fetchRunningRun(admin) };
    }
    return { error: { code: error.code, message: error.message } };
  }
  return { run: data as PipelineRun };
}

export async function fetchRunningRun(admin: SupabaseClient): Promise<PipelineRun | null> {
  const { data, error } = await admin
    .from('pipeline_runs')
    .select(RUN_SELECT)
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Reading the running pipeline run failed: ${error.message}`);
  return (data as PipelineRun | null) ?? null;
}

export type ProgressRecorder = {
  onProgress: ProgressFn;
  /** Writes any pending message now. Call before finalising the row. */
  flush: () => Promise<void>;
  /** The last non-transient message seen, written or not. */
  latest: () => string | null;
};

/**
 * Throttled writer for pipeline_runs.progress. Writes are serialised on one
 * promise chain so a slow write cannot be overtaken by a later one, and a
 * failed write is swallowed: progress is a courtesy, the run is what matters.
 */
export function createProgressRecorder(
  admin: SupabaseClient,
  runId: string,
  deps: { now?: () => number; setTimer?: typeof setTimeout; clearTimer?: typeof clearTimeout; throttleMs?: number } = {},
): ProgressRecorder {
  const now = deps.now ?? Date.now;
  const setTimer = deps.setTimer ?? setTimeout;
  const clearTimer = deps.clearTimer ?? clearTimeout;
  const throttleMs = deps.throttleMs ?? PROGRESS_THROTTLE_MS;

  let latest: string | null = null;
  let written: string | null = null;
  let lastWriteAt = -Infinity;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();

  function write(): void {
    if (latest === null || latest === written) return;
    const message = latest;
    written = message;
    lastWriteAt = now();
    chain = chain.then(async () => {
      const { error } = await admin.from('pipeline_runs').update({ progress: message }).eq('id', runId).eq('status', 'running');
      if (error) console.warn(`[pipeline] progress write failed for run ${runId}: ${error.message}`);
    });
  }

  const onProgress: ProgressFn = (message, transient) => {
    if (transient) return;
    const trimmed = message.trim();
    if (!trimmed) return;
    latest = trimmed;
    const elapsed = now() - lastWriteAt;
    if (elapsed >= throttleMs) {
      write();
    } else if (timer === null) {
      timer = setTimer(() => {
        timer = null;
        write();
      }, throttleMs - elapsed);
    }
  };

  return {
    onProgress,
    latest: () => latest,
    flush: async () => {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
      write();
      await chain;
    },
  };
}

/** The result as stored: refresh's `rows` (thousands of BracketRow objects) is dropped; rowsComputed keeps the count. */
export function toStoredResult(step: PipelineStep, result: unknown): Record<string, unknown> {
  if (!result || typeof result !== 'object') return {};
  const copy: Record<string, unknown> = { ...(result as Record<string, unknown>) };
  if (step === 'refresh') delete copy.rows;
  return copy;
}

async function runStep(admin: SupabaseClient, run: PipelineRun, onProgress: ProgressFn): Promise<unknown> {
  const options = (run.options ?? {}) as RunOptions;
  switch (run.step) {
    case 'seed':
      return runSeed(admin, { onProgress });
    case 'prepass':
      return runPrepass(admin, { onProgress });
    case 'refresh':
      return runRefresh(admin, { dryRun: options.dryRun === true, onProgress });
    case 'classify':
      throw new Error('classify is not runnable from the admin page in this release.');
  }
}

/**
 * Runs the step for an already-inserted 'running' row and finalises it. Never
 * throws: a failure becomes status = 'failed' with the error text. Both
 * finalising updates are conditioned on status = 'running', so a row an admin
 * cleared as 'abandoned' mid-flight is not resurrected.
 */
export async function executeRun(admin: SupabaseClient, run: PipelineRun, now: () => number = Date.now): Promise<void> {
  const startedAt = Date.parse(run.started_at);
  const recorder = createProgressRecorder(admin, run.id);

  let patch: Record<string, unknown>;
  try {
    const result = await runStep(admin, run, recorder.onProgress);
    patch = { status: 'done', result: toStoredResult(run.step, result), error: null };
  } catch (err) {
    patch = { status: 'failed', error: err instanceof Error ? err.message : String(err) };
  }

  try {
    await recorder.flush();
  } catch {
    // progress is best-effort
  }

  const finishedAt = now();
  const { data, error } = await admin
    .from('pipeline_runs')
    .update({
      ...patch,
      finished_at: new Date(finishedAt).toISOString(),
      duration_ms: Number.isNaN(startedAt) ? null : Math.max(0, finishedAt - startedAt),
      progress: recorder.latest(),
    })
    .eq('id', run.id)
    .eq('status', 'running')
    .select('id');

  if (error) {
    console.error(`[pipeline] could not finalise run ${run.id} (${run.step}) as ${patch.status}: ${error.message}`);
  } else if (!data || data.length === 0) {
    console.warn(`[pipeline] run ${run.id} (${run.step}) finished as ${patch.status} but its row was no longer 'running' — probably cleared as abandoned.`);
  }
}

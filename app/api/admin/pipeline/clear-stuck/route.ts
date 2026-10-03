import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { requireOwnerApi } from '@/lib/auth/api-guards';
import { withNoStore } from '@/lib/http/no-store';
import {
  fetchRunningRun,
  isMissingTableError,
  isStale,
  MIGRATION_MISSING_MESSAGE,
  pipelineDisabledResponse,
  pipelineEnabled,
  RUN_SELECT,
  STALE_AFTER_MS,
} from '@/lib/admin/pipeline-runs';

/**
 * Recovery path for a run the process restart orphaned. The Node process on
 * the VPS is not supervised: a deploy's `fuser -k 30001/tcp` kills a step
 * mid-flight, nothing finalises its row, and the 'running' row holds the lock
 * forever. This marks it 'abandoned' — but only once it is older than 20
 * minutes (STALE_AFTER_MS), so a live run cannot be cleared by an impatient
 * click. Younger answers 409 with the row.
 *
 * The update is conditioned on status = 'running', so if the run finished
 * between the page's poll and this click, nothing is overwritten.
 */
export const POST = withNoStore(handlePOST);

async function handlePOST() {
  const auth = await requireOwnerApi();
  if ('error' in auth) return auth.error;

  if (!pipelineEnabled()) return pipelineDisabledResponse();

  const admin = createSupabaseAdminClient();

  let running;
  try {
    running = await fetchRunningRun(admin);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isMissingTableError({ message })) {
      return NextResponse.json({ error: MIGRATION_MISSING_MESSAGE, reason: 'pipeline_runs_missing' }, { status: 500 });
    }
    return NextResponse.json({ error: message, reason: 'status_failed' }, { status: 500 });
  }

  if (!running) {
    return NextResponse.json({ error: 'Nothing is running.', reason: 'no_running_run' }, { status: 404 });
  }
  if (!isStale(running)) {
    return NextResponse.json(
      { error: `This run showed signs of life less than ${STALE_AFTER_MS / 60000} minutes ago and may still be live.`, reason: 'run_not_stale', running },
      { status: 409 },
    );
  }

  const { data, error } = await admin
    .from('pipeline_runs')
    .update({
      status: 'abandoned',
      finished_at: new Date().toISOString(),
      error: `Marked abandoned by admin after ${STALE_AFTER_MS / 60000} minutes without a heartbeat or finish — presumed killed by a process restart.`,
    })
    .eq('id', running.id)
    .eq('status', 'running')
    .select(RUN_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message, reason: 'clear_failed' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'The run finished before it could be cleared.', reason: 'already_finished' }, { status: 409 });
  }

  return NextResponse.json({ cleared: data });
}

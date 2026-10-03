import { NextRequest, NextResponse, after } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { requireOwnerApi } from '@/lib/auth/api-guards';
import { withNoStore } from '@/lib/http/no-store';
import {
  executeRun,
  isMissingTableError,
  MIGRATION_MISSING_MESSAGE,
  parseRunRequest,
  pipelineDisabledResponse,
  pipelineEnabled,
  startRun,
} from '@/lib/admin/pipeline-runs';

/**
 * Starts one pipeline step from the admin Pipeline page. Owner only.
 *
 * Same shape as app/api/admin/creators/status/route.ts: owner gate, service-role
 * client, no-store. Then two gates of its own:
 *
 *  1. PIPELINE_ENABLED must be 'true' in the server's environment, else 503.
 *     Set on the VPS only, so Vercel — which also builds this repo — never
 *     runs a step. The steps walk every creator_posts row and one of them
 *     spends Anthropic credit; they belong on the one long-lived Node process
 *     Lukas operates, not on a lambda with a duration limit.
 *
 *  2. The lock. A 'running' row is inserted BEFORE any work; pipeline_runs'
 *     partial unique index (0023) rejects a second one with 23505, answered
 *     here as 409 carrying the row that is blocking. A double-click starts
 *     one run, not two, and the database is the referee.
 *
 * The work itself runs in after() from next/server, which this Next version
 * (16.1.6) exports: the response goes out with the run id immediately and the
 * step continues in the same process. On `next start` there is no deadline.
 * Progress goes to the row, never to the console.
 *
 * classify answers 400 in this release; the page shows its card disabled.
 */
export const POST = withNoStore(handlePOST);

async function handlePOST(req: NextRequest) {
  const auth = await requireOwnerApi();
  if ('error' in auth) return auth.error;

  if (!pipelineEnabled()) return pipelineDisabledResponse();

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const parsed = parseRunRequest(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error, reason: parsed.reason }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  let started;
  try {
    started = await startRun(admin, { step: parsed.step, options: parsed.options, triggeredBy: auth.userId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not start run', reason: 'start_failed' }, { status: 500 });
  }

  if ('conflict' in started) {
    return NextResponse.json(
      { error: 'A pipeline step is already running.', reason: 'run_in_progress', running: started.conflict },
      { status: 409 },
    );
  }
  if ('error' in started) {
    if (isMissingTableError(started.error)) {
      return NextResponse.json({ error: MIGRATION_MISSING_MESSAGE, reason: 'pipeline_runs_missing' }, { status: 500 });
    }
    return NextResponse.json({ error: started.error.message, reason: 'start_failed' }, { status: 500 });
  }

  const run = started.run;
  after(() => executeRun(admin, run));

  return NextResponse.json({ runId: run.id, run }, { status: 202 });
}

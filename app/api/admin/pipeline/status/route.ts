import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { requireOwnerApi } from '@/lib/auth/api-guards';
import { withNoStore } from '@/lib/http/no-store';
import {
  anthropicApiKey,
  isMissingTableError,
  isStale,
  MIGRATION_MISSING_MESSAGE,
  PIPELINE_STEPS,
  pipelineDisabledResponse,
  pipelineEnabled,
  RUN_SELECT,
  type PipelineRun,
  type PipelineStep,
} from '@/lib/admin/pipeline-runs';

/**
 * Everything the admin Pipeline page shows, in one owner-only GET: the
 * running row (and whether it is stale), the latest finished run per step,
 * the last 20 runs, and live table counts. The page polls this every 3 seconds
 * while a run is live, so it is cheap by construction: the run queries are
 * tiny, and every count is a HEAD request.
 *
 * pipeline_runs has no anon or authenticated policy (0023); this route is the
 * only way the page reads it.
 */
export const GET = withNoStore(handleGET);

const HISTORY_LIMIT = 20;

export type PipelineCounts = {
  aliasesUnclassified: number | null;
  aliasesEligible: number | null;
  /** Eligible for classify at min count 1 and 2. 1 is the unclassified count itself (every alias has at least one creator); 2 is the default rule. Nothing per-request for other values. */
  eligibleByMinCount: { 1: number | null; 2: number | null };
  brackets: number | null;
  bracketsRefreshedAt: string | null;
  creatorPosts: number | null;
};

async function handleGET(req: NextRequest) {
  const auth = await requireOwnerApi();
  if ('error' in auth) return auth.error;

  if (!pipelineEnabled()) return pipelineDisabledResponse();

  // The page polls every 3 seconds while a run is live and passes ?counts=0
  // on those polls: the counts are not what it is watching, and the exact
  // creator_posts count alone measured 7 seconds on 2026-10-03. Counts are
  // loaded on the first render and again when a run ends.
  const wantCounts = req.nextUrl.searchParams.get('counts') !== '0';

  const admin = createSupabaseAdminClient();
  const runs = () => admin.from('pipeline_runs').select(RUN_SELECT);

  const [running, history, ...latest] = await Promise.all([
    runs().eq('status', 'running').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    runs().order('started_at', { ascending: false }).limit(HISTORY_LIMIT),
    ...PIPELINE_STEPS.map((step) =>
      runs().eq('step', step).in('status', ['done', 'failed']).order('started_at', { ascending: false }).limit(1).maybeSingle(),
    ),
  ]);

  const firstError = [running.error, history.error, ...latest.map((r) => r.error)].find(Boolean);
  if (firstError) {
    if (isMissingTableError(firstError)) {
      return NextResponse.json({ error: MIGRATION_MISSING_MESSAGE, reason: 'pipeline_runs_missing' }, { status: 500 });
    }
    return NextResponse.json({ error: firstError.message, reason: 'status_failed' }, { status: 500 });
  }

  const latestByStep = Object.fromEntries(
    PIPELINE_STEPS.map((step, i) => [step, (latest[i].data as PipelineRun | null) ?? null]),
  ) as Record<PipelineStep, PipelineRun | null>;

  const counts = wantCounts ? await loadCounts(admin) : null;
  const runningRow = (running.data as PipelineRun | null) ?? null;

  return NextResponse.json({
    enabled: true,
    now: new Date().toISOString(),
    // Lets the page say whether classify can run on this host before anyone clicks.
    anthropicKeyPresent: anthropicApiKey() !== null,
    running: runningRow,
    // Stale = last sign of life (heartbeat, else start) older than 20 minutes;
    // a long classify that keeps writing batch lines is never stale.
    stale: runningRow ? isStale(runningRow) : false,
    latestByStep,
    history: (history.data ?? []) as PipelineRun[],
    counts,
  });
}

/**
 * Live counts, each a HEAD request; a failed count is null rather than a
 * failed page. creator_posts is the planner's estimate, not an exact count:
 * at ~244K rows the exact count measured 7 seconds against PostgREST on
 * 2026-10-03 and errored out through supabase-js under load, while the
 * planned count answered in under 300 ms. The tile is a size indicator, not
 * something a step's correctness depends on.
 */
async function loadCounts(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<PipelineCounts> {
  const head = { count: 'exact' as const, head: true };
  const planned = { count: 'planned' as const, head: true };
  const [unclassified, eligible, brackets, latestRefresh, posts] = await Promise.all([
    admin.from('brand_aliases').select('*', head).is('classified_at', null),
    admin.from('brand_aliases').select('*', head).is('classified_at', null).gte('creators_count', 2),
    admin.from('brand_brackets').select('*', head),
    admin.from('brand_brackets').select('refreshed_at').order('refreshed_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('creator_posts').select('*', planned),
  ]);
  const aliasesUnclassified = unclassified.error ? null : unclassified.count ?? 0;
  const aliasesEligible = eligible.error ? null : eligible.count ?? 0;
  return {
    aliasesUnclassified,
    aliasesEligible,
    eligibleByMinCount: { 1: aliasesUnclassified, 2: aliasesEligible },
    brackets: brackets.error ? null : brackets.count ?? 0,
    bracketsRefreshedAt: latestRefresh.error ? null : ((latestRefresh.data as { refreshed_at: string } | null)?.refreshed_at ?? null),
    creatorPosts: posts.error ? null : posts.count ?? 0,
  };
}

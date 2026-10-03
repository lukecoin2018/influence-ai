'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Admin Pipeline page: runs the post-scrape maintenance steps (lib/pipeline/*)
 * that used to be terminal-only, and shows what each last did.
 *
 * All data comes through /api/admin/pipeline/* — pipeline_runs has no browser
 * policy (0023), and the steps only run where PIPELINE_ENABLED is set (the
 * VPS). If the status route answers 503 this page shows its message and
 * nothing else; that is what Vercel's copy of /admin/pipeline looks like.
 *
 * While a run is live the page polls status every 3 seconds, disables every
 * Run button (the server's lock is the real guard; the disabled buttons just
 * say so), and shows elapsed time plus the run's latest progress line. A
 * running row older than 20 minutes is presumed orphaned by a process restart
 * and gets a "Clear stuck run" button.
 */

type PipelineStep = 'seed' | 'prepass' | 'classify' | 'refresh';
type RunStatus = 'running' | 'done' | 'failed' | 'abandoned';

type PipelineRun = {
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

type Counts = {
  aliasesUnclassified: number | null;
  aliasesEligible: number | null;
  brackets: number | null;
  bracketsRefreshedAt: string | null;
  creatorPosts: number | null;
};

type Status = {
  enabled: true;
  now: string;
  running: PipelineRun | null;
  stale: boolean;
  latestByStep: Record<PipelineStep, PipelineRun | null>;
  history: PipelineRun[];
  /** null when the request asked to skip the counts (polls). */
  counts: Counts | null;
};

const STEPS: { step: PipelineStep; title: string; description: string }[] = [
  { step: 'seed', title: 'Seed', description: 'Scans every creator_posts.detected_brands value and upserts each distinct alias into brand_aliases with a fresh creators_count. Never touches classification columns.' },
  { step: 'prepass', title: 'Prepass', description: 'Classifies unclassified aliases without AI: a match on a social_profiles handle becomes creator, a common-word match becomes fragment. The rest wait for classify.' },
  { step: 'classify', title: 'Classify', description: 'AI classification (Anthropic) of unclassified aliases with 2+ creators, 50 per batch. Writes canonical_name, entity_type, category, region and scores; never verified.' },
  { step: 'refresh', title: 'Refresh brackets', description: 'Recomputes brand_brackets from verified brand aliases, sponsored posts and follower counts: one row per brand × platform with its p25–p75 hiring bracket. Deletes rows the recompute no longer produces.' },
];

const POLL_MS = 3000;
const IDLE_POLL_MS = 30000;

type StatusOutcome =
  | { kind: 'ok'; status: Status }
  | { kind: 'disabled'; message: string }
  | { kind: 'error'; message: string };

/**
 * One GET of the status route, with no component state involved. Polls pass
 * withCounts = false: the counts are not what a poll is watching, and the
 * route skips the count queries when told so (counts comes back null and the
 * page keeps the ones it has).
 */
async function fetchStatus(withCounts: boolean): Promise<StatusOutcome> {
  try {
    const res = await fetch(`/api/admin/pipeline/status${withCounts ? '' : '?counts=0'}`, { cache: 'no-store' });
    const body = await res.json().catch(() => null);
    if (res.status === 503) return { kind: 'disabled', message: body?.error ?? 'The pipeline is disabled on this host.' };
    if (!res.ok) return { kind: 'error', message: body?.error ?? `HTTP ${res.status}` };
    return { kind: 'ok', status: body as Status };
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to load' };
  }
}

const RESULT_LABELS: Record<string, string> = {
  aliasesFound: 'aliases found',
  rowsUpserted: 'rows upserted',
  newAliases: 'new aliases',
  unclassified: 'unclassified',
  creatorMatches: 'creator matches',
  fragmentMatches: 'fragment matches',
  rowsUpdated: 'rows updated',
  remainingForAi: 'left for classify',
  eligible: 'eligible',
  batches: 'batches',
  batchesTotal: 'batches total',
  classified: 'classified',
  failedBatches: 'failed batches',
  omitted: 'omitted',
  byEntityType: 'by type',
  rowsComputed: 'rows computed',
  rowsWritten: 'rows written',
  staleDeleted: 'stale deleted',
  netChange: 'net change',
  mostRecentPost: 'newest post',
  oldestBracketSource: 'oldest bracket source',
  dryRun: 'dry run',
  minCount: 'min count',
  preview: 'preview',
};

const STATUS_COLORS: Record<RunStatus, { color: string; bg: string }> = {
  running: { color: '#1E40AF', bg: '#EFF6FF' },
  done: { color: '#065F46', bg: '#ECFDF5' },
  failed: { color: '#991B1B', bg: '#FEF2F2' },
  abandoned: { color: '#92400E', bg: '#FFFBEB' },
};

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function formatNumber(n: number | null): string {
  return n == null ? '—' : n.toLocaleString();
}

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}T/.test(value) ? formatWhen(value) : value;
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([k, v]) => `${k} ${(v as number).toLocaleString()}`)
      .join(' · ') || '—';
  }
  return String(value);
}

function ResultSummary({ result }: { result: Record<string, unknown> | null }) {
  if (!result) return null;
  const entries = Object.entries(result).filter(([key, value]) => key !== 'rows' && key !== 'brand' && !Array.isArray(value));
  if (entries.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: '8px' }}>
      {entries.map(([key, value]) => (
        <span key={key} style={{ fontSize: '12px', color: '#6B7280' }}>
          {RESULT_LABELS[key] ?? key}: <strong style={{ color: '#3A3A3A', fontWeight: 600 }}>{formatValue(value)}</strong>
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: c.color, backgroundColor: c.bg, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {status}
    </span>
  );
}

export default function AdminPipelinePage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [disabledMessage, setDisabledMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [starting, setStarting] = useState<PipelineStep | null>(null);
  const [clearing, setClearing] = useState(false);
  const [refreshDryRun, setRefreshDryRun] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const requestSeq = useRef(0);

  // Applies one status fetch. Setting state only here, from promise callbacks,
  // keeps the initial-load effect free of synchronous setState (React
  // Compiler lint) while polling and the action handlers share the same path.
  const applyStatus = useCallback((outcome: StatusOutcome) => {
    if (outcome.kind === 'disabled') {
      setDisabledMessage(outcome.message);
      setStatus(null);
      setLoadError(null);
    } else if (outcome.kind === 'error') {
      setLoadError(outcome.message);
    } else {
      setDisabledMessage(null);
      setLoadError(null);
      // A poll (counts null) keeps the counts already on screen.
      setStatus((prev) => ({ ...outcome.status, counts: outcome.status.counts ?? prev?.counts ?? null }));
    }
    setDataLoading(false);
  }, []);

  // A reply is applied only if no newer request was issued after it — polls
  // and action-triggered reloads can otherwise land out of order. When a poll
  // sees the run end, one more fetch with counts follows so the tiles reflect
  // what the step just changed.
  const wasRunning = useRef(false);
  const loadStatus = useCallback(async (withCounts: boolean) => {
    const seq = ++requestSeq.current;
    const outcome = await fetchStatus(withCounts);
    if (seq !== requestSeq.current) return;
    applyStatus(outcome);
    if (outcome.kind !== 'ok') return;
    const nowRunning = outcome.status.running !== null;
    const justEnded = wasRunning.current && !nowRunning;
    wasRunning.current = nowRunning;
    if (justEnded && !withCounts) {
      const seq2 = ++requestSeq.current;
      const refreshed = await fetchStatus(true);
      if (seq2 === requestSeq.current) applyStatus(refreshed);
    }
  }, [applyStatus]);

  useEffect(() => {
    if (loading) return;
    if (!user || userRole !== 'admin') { router.push('/login'); return; }
    let cancelled = false;
    const seq = ++requestSeq.current;
    fetchStatus(true).then((outcome) => {
      if (cancelled || seq !== requestSeq.current) return;
      applyStatus(outcome);
      if (outcome.kind === 'ok') wasRunning.current = outcome.status.running !== null;
    });
    return () => { cancelled = true; };
  }, [loading, user, userRole, router, applyStatus]);

  // Two poll rates, both without counts. While a run is live: every 3 seconds,
  // plus a 1-second ticker for the elapsed display; the response that reports
  // the run finished triggers one counts refetch inside loadStatus. While idle:
  // every 30 seconds, so a run started from another tab or session shows up
  // here without a reload and the page switches to the fast poll by itself.
  const running = status?.running ?? null;
  const pollable = status !== null && disabledMessage === null;
  useEffect(() => {
    if (!pollable) return;
    const poll = setInterval(() => loadStatus(false), running ? POLL_MS : IDLE_POLL_MS);
    const tick = running ? setInterval(() => setNowMs(Date.now()), 1000) : null;
    return () => { clearInterval(poll); if (tick) clearInterval(tick); };
  }, [pollable, running, loadStatus]);

  async function startStep(step: PipelineStep) {
    setStarting(step);
    setActionError(null);
    setActionNotice(null);
    try {
      const options = step === 'refresh' ? { dryRun: refreshDryRun } : undefined;
      const res = await fetch('/api/admin/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, options }),
      });
      const body = await res.json().catch(() => null);
      if (res.status === 409 && body?.reason === 'run_in_progress') {
        const blocking = body.running as PipelineRun | null;
        setActionNotice(blocking ? `Already running: ${blocking.step}, started ${formatWhen(blocking.started_at)}.` : 'Another run just finished — refreshed.');
        return;
      }
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setActionNotice(`${step} started.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start');
    } finally {
      setStarting(null);
      // No counts here: the running state must appear at once, and the
      // end-of-run poll refetches counts anyway.
      await loadStatus(false);
    }
  }

  async function clearStuck() {
    setClearing(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const res = await fetch('/api/admin/pipeline/clear-stuck', { method: 'POST' });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setActionNotice('Stuck run marked abandoned.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to clear');
    } finally {
      setClearing(false);
      await loadStatus(false);
    }
  }

  if (loading) return null;
  if (!user || userRole !== 'admin') return null;

  const anyRunning = running !== null;
  const busy = anyRunning || starting !== null;

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Pipeline</h1>
      <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 24px 0' }}>
        Post-scrape maintenance, in order: seed → prepass → classify → refresh brackets. One step runs at a time; each is safe to rerun.
        Runs happen on this server and continue after you leave the page.
      </p>

      {dataLoading ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Loading...</p>
      ) : disabledMessage ? (
        <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '16px 20px' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#92400E', margin: '0 0 4px 0' }}>Pipeline disabled here</p>
          <p style={{ fontSize: '13px', color: '#B45309', margin: 0 }}>{disabledMessage}</p>
        </div>
      ) : loadError ? (
        <div>
          <p style={{ color: '#DC2626', fontSize: '14px', margin: '0 0 8px 0' }}>Failed to load — {loadError}</p>
          <button onClick={() => loadStatus(true)} style={primaryBtn}>Retry</button>
        </div>
      ) : status ? (
        <>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <CountTile label="creator posts (estimate)" value={formatNumber(status.counts?.creatorPosts ?? null)} />
            <CountTile label="aliases unclassified" value={formatNumber(status.counts?.aliasesUnclassified ?? null)} />
            <CountTile label="eligible for classify (2+ creators)" value={formatNumber(status.counts?.aliasesEligible ?? null)} />
            <CountTile label="brand brackets" value={formatNumber(status.counts?.brackets ?? null)} sub={status.counts?.bracketsRefreshedAt ? `refreshed ${formatWhen(status.counts.bracketsRefreshedAt)}` : 'never refreshed'} />
          </div>

          {status.stale && running && (
            <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#92400E' }}>
                <strong>{running.step}</strong> has been running since {formatWhen(running.started_at)} — more than 20 minutes. It was probably killed by a server restart and is holding the lock.
              </span>
              <button onClick={clearStuck} disabled={clearing} style={{ ...primaryBtn, backgroundColor: '#92400E', opacity: clearing ? 0.6 : 1 }}>
                {clearing ? 'Clearing...' : 'Clear stuck run'}
              </button>
            </div>
          )}

          {actionError && <p style={{ color: '#DC2626', fontSize: '13px', margin: '0 0 12px 0' }}>{actionError}</p>}
          {actionNotice && <p style={{ color: '#065F46', fontSize: '13px', margin: '0 0 12px 0' }}>{actionNotice}</p>}

          <div style={{ display: 'grid', gap: '12px', marginBottom: '28px' }}>
            {STEPS.map(({ step, title, description }) => {
              const isRunningThis = running?.step === step;
              const last = status.latestByStep[step];
              const comingSoon = step === 'classify';
              const elapsed = isRunningThis && running ? Math.max(0, nowMs - Date.parse(running.started_at)) : null;
              return (
                <div key={step} style={{ backgroundColor: 'white', borderRadius: '12px', border: `1px solid ${isRunningThis ? '#93C5FD' : '#E5E7EB'}`, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>{title}</h2>
                        {isRunningThis && <StatusBadge status="running" />}
                      </div>
                      <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>{description}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {step === 'refresh' && (
                        <label style={{ fontSize: '12px', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', cursor: busy ? 'default' : 'pointer' }}>
                          <input type="checkbox" checked={refreshDryRun} disabled={busy} onChange={(e) => setRefreshDryRun(e.target.checked)} />
                          dry run
                        </label>
                      )}
                      <button
                        onClick={() => startStep(step)}
                        disabled={busy || comingSoon}
                        title={comingSoon ? 'Coming in the next release' : undefined}
                        style={{ ...primaryBtn, opacity: busy || comingSoon ? 0.5 : 1, cursor: busy || comingSoon ? 'default' : 'pointer' }}
                      >
                        {comingSoon ? 'Coming in the next release' : starting === step ? 'Starting...' : isRunningThis ? 'Running...' : 'Run'}
                      </button>
                    </div>
                  </div>

                  {isRunningThis && running && (
                    <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: '#EFF6FF', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 600 }}>Elapsed {formatDuration(elapsed)}</div>
                      <div style={{ fontSize: '12px', color: '#1E3A8A', fontFamily: 'monospace', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                        {running.progress ?? 'Starting...'}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '12px', borderTop: '1px solid #F3F4F6', paddingTop: '10px' }}>
                    {last ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#6B7280', flexWrap: 'wrap' }}>
                          <span>Last run {formatWhen(last.started_at)}</span>
                          <span>·</span>
                          <span>{formatDuration(last.duration_ms)}</span>
                          <StatusBadge status={last.status} />
                          {last.options && Object.keys(last.options).length > 0 && (
                            <span style={{ fontFamily: 'monospace', color: '#9CA3AF' }}>{JSON.stringify(last.options)}</span>
                          )}
                        </div>
                        {last.status === 'failed' && last.error && (
                          <p style={{ fontSize: '12px', color: '#DC2626', margin: '6px 0 0 0', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{last.error}</p>
                        )}
                        <ResultSummary result={last.result} />
                      </>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Never run from here.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 10px 0' }}>History</h2>
          {status.history.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No runs yet.</p>
          ) : (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <th style={thStyle}>Started</th>
                    <th style={thStyle}>Step</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Duration</th>
                    <th style={{ ...thStyle, width: '45%' }}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {status.history.map((run) => (
                    <tr key={run.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#6B7280' }}>{formatWhen(run.started_at)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {run.step}
                        {run.options?.dryRun === true && <span style={{ color: '#9CA3AF', fontWeight: 400 }}> (dry run)</span>}
                      </td>
                      <td style={tdStyle}><StatusBadge status={run.status} /></td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#6B7280' }}>{formatDuration(run.duration_ms)}</td>
                      <td style={{ ...tdStyle, color: '#6B7280' }}>
                        {run.status === 'failed' || run.status === 'abandoned'
                          ? <span style={{ color: '#DC2626', fontFamily: 'monospace', fontSize: '12px' }}>{run.error ?? '—'}</span>
                          : run.status === 'running'
                            ? <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{run.progress ?? 'Starting...'}</span>
                            : <ResultSummary result={run.result} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function CountTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '12px 16px', minWidth: '160px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: '#3A3A3A', marginTop: '2px' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

const primaryBtn: React.CSSProperties = { padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#FFD700', color: 'white', whiteSpace: 'nowrap' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' };
const tdStyle: React.CSSProperties = { padding: '8px 14px', color: '#3A3A3A', verticalAlign: 'top' };

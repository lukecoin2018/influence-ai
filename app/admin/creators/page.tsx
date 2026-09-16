'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { countLine, describeEvent, type DashboardEventRow, type EngagementCounts } from '@/lib/admin/dashboard-event-labels';
import { CREATOR_HANDLE_SELECT, primaryHandle } from '@/lib/admin/primary-handle';

type FilterType = 'all' | 'pending' | 'verified' | 'rejected';

/** The 0020 columns the page relies on, plus the 0021 counts, which may be absent. */
type EngagementRow = { creator_profile_id: string; last_event_at: string; event_count: number } & EngagementCounts;

/** Per-creator activity list: absent = not opened yet; 'loading' / 'error' one-word states. */
type ActivityState = DashboardEventRow[] | 'loading' | 'error';

const DATE_FMT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', DATE_FMT);
// Same date wording as "Claimed", plus the time, in the admin's local zone.
const fmtDateTime = (iso: string) => `${fmtDate(iso)} ${new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

export default function AdminCreatorsPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [creators, setCreators] = useState<any[]>([]);
  // creator_profile_id → v_creator_engagement row. null until the view has
  // answered; stays null if it errors (0020 not applied yet), in which case
  // the row line is simply not rendered rather than claiming "never".
  const [engagement, setEngagement] = useState<Record<string, EngagementRow> | null>(null);
  // Expanded activity per creator, loaded once on first expand and kept.
  const [activity, setActivity] = useState<Record<string, ActivityState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<FilterType>('all');
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (loading) return;
    if (!user || userRole !== 'admin') { router.push('/login'); return; }
    load();
  }, [loading, user, userRole, filter]);

  async function load() {
    const seq = ++requestSeq.current;
    setDataLoading(true);
    setLoadError(null);
    try {
      let query = supabase.from('creator_profiles').select(`*, ${CREATOR_HANDLE_SELECT}`).order('created_at', { ascending: false });
      if (filter !== 'all') query = query.eq('claim_status', filter);
      const { data, error } = await query;
      if (error) throw error;
      if (seq !== requestSeq.current) return;
      setCreators(data ?? []);
      // One batched read of the view for the rows just loaded — not one per
      // row. Admin-only SELECT policy + security_invoker view (0020); a
      // non-admin session would get zero rows, never an error.
      //
      // select('*'), not a column list: the n_<type> counts arrive with 0021,
      // which is applied by hand. Naming them would make the whole read fail
      // (and hide "Last active") until then; with `*` they are simply
      // undefined and the count line reads them as 0.
      const ids = (data ?? []).map((cp) => cp.id);
      const { data: eng, error: engError } = ids.length
        ? await supabase.from('v_creator_engagement').select('*').in('creator_profile_id', ids)
        : { data: [], error: null };
      if (seq !== requestSeq.current) return;
      setEngagement(engError ? null : Object.fromEntries(((eng ?? []) as EngagementRow[]).map((r) => [r.creator_profile_id, r])));
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('Failed to load creator_profiles:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      if (seq === requestSeq.current) setDataLoading(false);
    }
  }

  // Through /api/admin/creators/status, not a browser-side UPDATE. The route
  // writes the full field set verify-bio writes (claimed_at, cleared code,
  // reset attempts) and the audit row; the old one-column update left
  // claimed_at NULL and the code live. See the route's header.
  //
  // Approve also emails the creator (Reject does not). The route reports the
  // outcome as emailStatus; the DB write succeeded regardless, so a failed
  // send is a notice next to a successful approval, never an error state.
  async function updateStatus(creatorProfileId: string, status: 'verified' | 'rejected') {
    setActionLoading(creatorProfileId + status);
    setActionError(null);
    setActionNotice(null);
    try {
      const res = await fetch('/api/admin/creators/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorProfileId, status }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.reason ? `${res.status} ${body.reason}` : `HTTP ${res.status}`);
      }
      if (status === 'verified') {
        const emailStatus = body?.emailStatus as 'sent' | 'failed' | 'skipped' | undefined;
        setActionNotice(
          emailStatus === 'sent' ? 'Approved · email sent'
          : emailStatus === 'failed' ? 'Approved · email FAILED — check server logs'
          : emailStatus === 'skipped' ? 'Already verified · no email sent'
          : 'Approved',
        );
      }
      await load();
    } catch (err) {
      console.error('Failed to update creator status:', err);
      setActionError(err instanceof Error ? `Failed to update — ${err.message}` : 'Failed to update');
    } finally {
      setActionLoading(null);
    }
  }

  // Lazy: one query per creator, on the first expand only, then cached in
  // state. Reads the table directly through the same admin SELECT policy the
  // view relies on — no route, no service role. Unknown future event types
  // come back like any other row and describeEvent() renders them raw.
  async function toggleActivity(creatorProfileId: string) {
    const open = !expanded[creatorProfileId];
    setExpanded((prev) => ({ ...prev, [creatorProfileId]: open }));
    if (!open || activity[creatorProfileId]) return;
    setActivity((prev) => ({ ...prev, [creatorProfileId]: 'loading' }));
    const { data, error } = await supabase
      .from('creator_dashboard_events')
      .select('event_type, details, created_at')
      .eq('creator_profile_id', creatorProfileId)
      .order('created_at', { ascending: false })
      .limit(20);
    setActivity((prev) => ({ ...prev, [creatorProfileId]: error ? 'error' : ((data ?? []) as DashboardEventRow[]) }));
  }

  const statusBadge = (status: string) => {
    const config: Record<string, { color: string; bg: string; label: string }> = {
      pending:   { color: '#92400E', bg: '#FFFBEB', label: '⏳ Pending' },
      verified:  { color: '#065F46', bg: '#ECFDF5', label: '✅ Verified' },
      rejected:  { color: '#991B1B', bg: '#FEF2F2', label: '❌ Rejected' },
      unclaimed: { color: '#6B7280', bg: '#F3F4F6', label: '◯ Unclaimed' },
    };
    const c = config[status] ?? config.unclaimed;
    return <span style={{ padding: '3px 10px', borderRadius: '999px', backgroundColor: c.bg, fontSize: '12px', fontWeight: 600, color: c.color }}>{c.label}</span>;
  };

  const filterBtn = (value: FilterType, label: string) => (
    <button key={value} onClick={() => setFilter(value)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none', backgroundColor: filter === value ? '#FFD700' : '#F3F4F6', color: filter === value ? 'white' : '#374151' }}>
      {label}
    </button>
  );

  if (loading) return null;
  if (!user || userRole !== 'admin') return null;

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 24px 0', letterSpacing: '-0.02em' }}>Creator Verification</h1>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {filterBtn('all', 'All')}{filterBtn('pending', 'Pending')}{filterBtn('verified', 'Verified')}{filterBtn('rejected', 'Rejected')}
      </div>
      {actionError && (
        <p style={{ color: '#DC2626', fontSize: '13px', margin: '0 0 12px 0' }}>{actionError}</p>
      )}
      {actionNotice && (
        <p style={{ color: actionNotice.includes('FAILED') ? '#B45309' : '#065F46', fontSize: '13px', margin: '0 0 12px 0' }}>{actionNotice}</p>
      )}
      {dataLoading ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Loading...</p>
      ) : loadError ? (
        <div>
          <p style={{ color: '#DC2626', fontSize: '14px', margin: '0 0 8px 0' }}>Failed to load — {loadError}</p>
          <button onClick={load} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#FFD700', color: 'white' }}>
            Retry
          </button>
        </div>
      ) : creators.length === 0 ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No creators found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {creators.map((cp) => {
            const creatorData = (cp.creators as any) ?? {};
            const handle = primaryHandle(creatorData.social_profiles) ?? 'unknown';
            const eng = engagement?.[cp.id];
            // '' before 0021 (no n_* columns) and for a creator with no
            // events; the line is omitted in both cases.
            const counts = eng && eng.event_count > 0 ? countLine(eng) : '';
            const isOpen = !!expanded[cp.id];
            const rows = activity[cp.id];
            return (
              <div key={cp.id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280' }}>{(creatorData.display_name ?? handle ?? '?').slice(0, 2).toUpperCase()}</span>
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#3A3A3A' }}>{cp.display_name ?? creatorData.display_name ?? `@${handle}`}</span>
                      {statusBadge(cp.claim_status)}
                    </div>
                    <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 2px 0' }}>@{handle}</p>
                    {cp.custom_bio && <p style={{ fontSize: '13px', color: '#374151', margin: '4px 0 0 0', maxWidth: '500px' }}>{cp.custom_bio.slice(0, 120)}...</p>}
                    <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '6px 0 0 0' }}>Claimed: {fmtDate(cp.created_at)}</p>
                    {engagement && (
                      <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0 0' }}>
                        Last active: {eng ? `${fmtDate(eng.last_event_at)} · ${eng.event_count} events` : 'never'}
                      </p>
                    )}
                    {counts && (
                      <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0 0', overflowWrap: 'anywhere' }}>{counts}</p>
                    )}
                    {eng && eng.event_count > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleActivity(cp.id)}
                        aria-expanded={isOpen}
                        style={{ padding: 0, marginTop: '4px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}
                      >
                        Activity {isOpen ? '▾' : '▸'}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {handle !== 'unknown' && (
                      <Link href={`/admin/preview/creator/${encodeURIComponent(handle)}`} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', textDecoration: 'none' }}>
                        👁 Preview Dashboard
                      </Link>
                    )}
                    {cp.claim_status !== 'verified' && <button onClick={() => updateStatus(cp.id, 'verified')} disabled={actionLoading === cp.id + 'verified'} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#ECFDF5', color: '#065F46' }}>✅ Verify</button>}
                    {cp.claim_status !== 'rejected' && <button onClick={() => updateStatus(cp.id, 'rejected')} disabled={actionLoading === cp.id + 'rejected'} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#FEF2F2', color: '#991B1B' }}>❌ Reject</button>}
                  </div>
                </div>
                {isOpen && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F3F4F6', maxHeight: '260px', overflowY: 'auto' }}>
                    {rows === 'loading' || rows === undefined ? (
                      <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>Loading…</p>
                    ) : rows === 'error' ? (
                      <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>Unavailable</p>
                    ) : rows.length === 0 ? (
                      <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>No events</p>
                    ) : (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {rows.map((row, i) => (
                          <li key={`${row.created_at}-${i}`} style={{ fontSize: '12px', color: '#6B7280', overflowWrap: 'anywhere' }}>
                            <span style={{ color: '#9CA3AF' }}>{fmtDateTime(row.created_at)}</span> · {describeEvent(row)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type FilterType = 'all' | 'pending' | 'verified' | 'rejected';

export default function AdminCreatorsPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [creators, setCreators] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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
      let query = supabase.from('creator_profiles').select('*, creators!creator_id(display_name, instagram_handle)').order('created_at', { ascending: false });
      if (filter !== 'all') query = query.eq('claim_status', filter);
      const { data, error } = await query;
      if (error) throw error;
      if (seq !== requestSeq.current) return;
      setCreators(data ?? []);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('Failed to load creator_profiles:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      if (seq === requestSeq.current) setDataLoading(false);
    }
  }

  async function updateStatus(creatorProfileId: string, status: string) {
    setActionLoading(creatorProfileId + status);
    setActionError(null);
    try {
      const { error } = await supabase.from('creator_profiles').update({ claim_status: status }).eq('id', creatorProfileId);
      if (error) throw error;
      await supabase.from('activity_log').insert({ event_type: status === 'verified' ? 'creator_verified' : 'creator_rejected', target_id: creatorProfileId, details: { action: status } });
      await load();
    } catch (err) {
      console.error('Failed to update creator status:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setActionLoading(null);
    }
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
            const handle = creatorData.instagram_handle ?? creatorData.tiktok_handle ?? 'unknown';
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
                    <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '6px 0 0 0' }}>Claimed: {new Date(cp.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

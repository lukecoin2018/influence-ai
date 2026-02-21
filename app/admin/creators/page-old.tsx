'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type FilterType = 'all' | 'pending' | 'verified' | 'rejected';

export default function AdminCreatorsPage() {
  const [creators, setCreators] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let query = supabase
      .from('creator_profiles')
      .select('*, creators!creator_id(name, instagram_handle, tiktok_handle)')
      .order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('claim_status', filter);
    const { data } = await query;
    setCreators(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function updateStatus(creatorProfileId: string, status: string) {
    setActionLoading(creatorProfileId + status);
    await supabase.from('creator_profiles').update({ claim_status: status }).eq('id', creatorProfileId);
    await supabase.from('activity_log').insert({
      event_type: status === 'verified' ? 'creator_verified' : 'creator_rejected',
      target_id: creatorProfileId,
      details: { action: status },
    });
    await load();
    setActionLoading(null);
  }

  const statusBadge = (status: string) => {
    const config: Record<string, { color: string; bg: string; label: string }> = {
      pending:   { color: '#92400E', bg: '#FFFBEB', label: '⏳ Pending' },
      verified:  { color: '#065F46', bg: '#ECFDF5', label: '✅ Verified' },
      rejected:  { color: '#991B1B', bg: '#FEF2F2', label: '❌ Rejected' },
      unclaimed: { color: '#6B7280', bg: '#F3F4F6', label: '◯ Unclaimed' },
    };
    const c = config[status] ?? config.unclaimed;
    return (
      <span style={{ padding: '3px 10px', borderRadius: '999px', backgroundColor: c.bg, fontSize: '12px', fontWeight: 600, color: c.color }}>
        {c.label}
      </span>
    );
  };

  const filterBtn = (value: FilterType, label: string) => (
    <button
      key={value}
      onClick={() => setFilter(value)}
      style={{
        padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none',
        backgroundColor: filter === value ? '#7C3AED' : '#F3F4F6',
        color: filter === value ? 'white' : '#374151',
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 24px 0', letterSpacing: '-0.02em' }}>Creator Verification</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {filterBtn('all', 'All')}
        {filterBtn('pending', 'Pending')}
        {filterBtn('verified', 'Verified')}
        {filterBtn('rejected', 'Rejected')}
      </div>

      {loading ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Loading...</p>
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
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED' }}>
                          {(creatorData.name ?? handle ?? '?').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{cp.display_name ?? creatorData.name ?? `@${handle}`}</span>
                      {statusBadge(cp.claim_status)}
                    </div>
                    <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 2px 0' }}>@{handle}</p>
                    {cp.custom_bio && <p style={{ fontSize: '13px', color: '#374151', margin: '4px 0 0 0', maxWidth: '500px' }}>{cp.custom_bio.slice(0, 120)}...</p>}
                    <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '6px 0 0 0' }}>
                      Claimed: {new Date(cp.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {cp.claim_status !== 'verified' && (
                      <button
                        onClick={() => updateStatus(cp.id, 'verified')}
                        disabled={actionLoading === cp.id + 'verified'}
                        style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#ECFDF5', color: '#065F46' }}
                      >
                        ✅ Verify
                      </button>
                    )}
                    {cp.claim_status !== 'rejected' && (
                      <button
                        onClick={() => updateStatus(cp.id, 'rejected')}
                        disabled={actionLoading === cp.id + 'rejected'}
                        style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#FEF2F2', color: '#991B1B' }}
                      >
                        ❌ Reject
                      </button>
                    )}
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

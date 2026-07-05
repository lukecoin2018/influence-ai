'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended';

export default function AdminBrandsPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [brands, setBrands] = useState<any[]>([]);
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
      let query = supabase.from('brand_profiles').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') query = query.eq('approval_status', filter);
      const { data, error } = await query;
      if (error) throw error;
      if (seq !== requestSeq.current) return;
      setBrands(data ?? []);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('Failed to load brand_profiles:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      if (seq === requestSeq.current) setDataLoading(false);
    }
  }

  async function updateStatus(brandId: string, status: string) {
    setActionLoading(brandId + status);
    setActionError(null);
    try {
      const { error } = await supabase.from('brand_profiles').update({ approval_status: status }).eq('id', brandId);
      if (error) throw error;
      await supabase.from('activity_log').insert({ event_type: `brand_${status}`, target_id: brandId, details: { action: status } });
      await load();
    } catch (err) {
      console.error('Failed to update brand status:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setActionLoading(null);
    }
  }

  const statusBadge = (status: string) => {
    const config: Record<string, { color: string; bg: string; label: string }> = {
      pending:   { color: '#92400E', bg: '#FFFBEB', label: '⏳ Pending' },
      approved:  { color: '#065F46', bg: '#ECFDF5', label: '✅ Approved' },
      rejected:  { color: '#991B1B', bg: '#FEF2F2', label: '❌ Rejected' },
      suspended: { color: '#6B7280', bg: '#F3F4F6', label: '🚫 Suspended' },
    };
    const c = config[status] ?? config.pending;
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
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 24px 0', letterSpacing: '-0.02em' }}>Brand Management</h1>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {filterBtn('all', 'All')}{filterBtn('pending', 'Pending')}{filterBtn('approved', 'Approved')}{filterBtn('rejected', 'Rejected')}{filterBtn('suspended', 'Suspended')}
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
      ) : brands.length === 0 ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No brands found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {brands.map((brand) => (
            <div key={brand.id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '20px' }}>🏢</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#3A3A3A' }}>{brand.company_name}</span>
                    {statusBadge(brand.approval_status ?? 'pending')}
                  </div>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 4px 0' }}>{brand.email} · {brand.industry ?? 'No industry'}</p>
                  {brand.website && <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 4px 0' }}>🌐 {brand.website}</p>}
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>Signed up: {new Date(brand.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {brand.approval_status !== 'approved' && <button onClick={() => updateStatus(brand.id, 'approved')} disabled={actionLoading === brand.id + 'approved'} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#ECFDF5', color: '#065F46' }}>✅ Approve</button>}
                  {brand.approval_status !== 'rejected' && <button onClick={() => updateStatus(brand.id, 'rejected')} disabled={actionLoading === brand.id + 'rejected'} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#FEF2F2', color: '#991B1B' }}>❌ Reject</button>}
                  {brand.approval_status === 'approved' && <button onClick={() => updateStatus(brand.id, 'suspended')} disabled={actionLoading === brand.id + 'suspended'} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#F3F4F6', color: '#6B7280' }}>🚫 Suspend</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

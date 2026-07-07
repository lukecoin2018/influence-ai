'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AdminInquiriesPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || userRole !== 'admin') { router.push('/login'); return; }
    load();
  }, [loading, user, userRole]);

  async function load() {
    setDataLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*, brand_profiles(company_name, email), creators!creator_id(display_name, instagram_handle, contact_email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInquiries(data ?? []);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setDataLoading(false);
    }
  }

  if (loading) return null;
  if (!user || userRole !== 'admin') return null;

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 24px 0', letterSpacing: '-0.02em' }}>Inquiries</h1>
      {dataLoading ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Loading...</p>
      ) : loadError ? (
        <div>
          <p style={{ color: '#DC2626', fontSize: '14px', margin: '0 0 8px 0' }}>Failed to load — {loadError}</p>
          <button onClick={load} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#FFD700', color: 'white' }}>
            Retry
          </button>
        </div>
      ) : inquiries.length === 0 ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No inquiries yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {inquiries.map((inq) => {
            const creator = inq.creators as any;
            const brand = inq.brand_profiles as any;
            const handle = creator?.instagram_handle ?? creator?.tiktok_handle ?? 'unknown';
            return (
              <div key={inq.id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#3A3A3A' }}>{brand?.company_name ?? 'Unknown Brand'}</span>
                      <span style={{ fontSize: '13px', color: '#9CA3AF' }}>→</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#3A3A3A' }}>@{handle}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {inq.campaign_type && <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>📋 {inq.campaign_type}</p>}
                      {inq.budget_range && <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>💰 {inq.budget_range}</p>}
                      {brand?.email && <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>✉️ {brand.email}</p>}
                      {creator?.contact_email && <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>📧 {creator.contact_email}</p>}
                    </div>
                    {inq.message && <p style={{ fontSize: '13px', color: '#374151', margin: '8px 0 0 0', maxWidth: '500px', fontStyle: 'italic' }}>"{inq.message.slice(0, 150)}{inq.message.length > 150 ? '...' : ''}"</p>}
                  </div>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0, flexShrink: 0 }}>{new Date(inq.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

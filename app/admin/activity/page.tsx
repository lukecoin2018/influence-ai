'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AdminActivityPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [activity, setActivity] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  useEffect(() => {
    if (loading) return;
    if (!user || userRole !== 'admin') { router.push('/login'); return; }
    load(0);
  }, [loading, user, userRole]);

  async function load(pageNum: number) {
    setDataLoading(true);
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);
    if (pageNum === 0) {
      setActivity(data ?? []);
    } else {
      setActivity((prev) => [...prev, ...(data ?? [])]);
    }
    setDataLoading(false);
  }

  function activityLabel(event: any) {
    switch (event.event_type) {
      case 'brand_signup': return `Brand "${event.details?.company_name ?? 'Unknown'}" signed up (pending approval)`;
      case 'brand_approved': return `Brand approved by admin`;
      case 'brand_rejected': return `Brand rejected by admin`;
      case 'brand_suspended': return `Brand suspended by admin`;
      case 'creator_signup': return `Creator @${event.details?.handle ?? 'unknown'} signed up`;
      case 'creator_verified': return `Creator verified by admin`;
      case 'creator_rejected': return `Creator claim rejected by admin`;
      case 'inquiry_sent': return `Inquiry: ${event.details?.brand_name ?? 'Brand'} → creator`;
      case 'contact_form': return `Contact form: ${event.details?.name ?? ''} (${event.details?.email ?? ''}) — ${event.details?.type ?? 'General'}`;
      default: return event.event_type;
    }
  }

  function eventColor(type: string) {
    if (type.includes('approved') || type.includes('verified')) return '#059669';
    if (type.includes('rejected') || type.includes('suspended')) return '#DC2626';
    if (type.includes('signup')) return '#FFD700';
    if (type.includes('inquiry')) return '#D97706';
    return '#9CA3AF';
  }

  const grouped = activity.reduce((acc: Record<string, any[]>, event) => {
    const date = new Date(event.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  if (loading) return null;
  if (!user || userRole !== 'admin') return null;

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 24px 0', letterSpacing: '-0.02em' }}>Activity Log</h1>

      {dataLoading && activity.length === 0 ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Loading...</p>
      ) : activity.length === 0 ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No activity yet.</p>
      ) : (
        <>
          {Object.entries(grouped).map(([date, events]) => (
            <div key={date} style={{ marginBottom: '28px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>{date}</p>
              <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                {events.map((event, i) => (
                  <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: i < events.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: eventColor(event.event_type), flexShrink: 0 }} />
                    <p style={{ flex: 1, fontSize: '14px', color: '#374151', margin: 0 }}>{activityLabel(event)}</p>
                    <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0, flexShrink: 0 }}>{new Date(event.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {!dataLoading && activity.length % PAGE_SIZE === 0 && (
            <button onClick={() => { const next = page + 1; setPage(next); load(next); }} style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151' }}>
              Load More
            </button>
          )}

          {dataLoading && <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '16px' }}>Loading...</p>}
        </>
      )}
    </div>
  );
}

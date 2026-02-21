'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/formatters';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { count: totalCreators },
        { count: totalBrands },
        { count: pendingBrands },
        { count: pendingCreators },
        { count: totalInquiries },
        { count: contactMsgs },
        { count: embeddedCreators },
        { data: recentActivity },
      ] = await Promise.all([
        supabase.from('creators').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('brand_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('brand_profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('creator_profiles').select('*', { count: 'exact', head: true }).eq('claim_status', 'pending'),
        supabase.from('inquiries').select('*', { count: 'exact', head: true }),
        supabase.from('contact_submissions').select('*', { count: 'exact', head: true }),
        supabase.from('creators').select('*', { count: 'exact', head: true }).not('embedding', 'is', null),
        supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      setStats({ totalCreators, totalBrands, pendingBrands, pendingCreators, totalInquiries, contactMsgs, embeddedCreators });
      setActivity(recentActivity ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const statCard = (label: string, value: number | null, highlight = false) => (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #E5E7EB' }}>
      <p style={{ fontSize: '28px', fontWeight: 800, color: highlight ? '#7C3AED' : '#111827', margin: '0 0 4px 0' }}>
        {value ?? '—'}
      </p>
      <p style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
    </div>
  );

  function activityLabel(event: any) {
    switch (event.event_type) {
      case 'brand_signup': return `Brand "${event.details?.company_name ?? 'Unknown'}" signed up`;
      case 'brand_approved': return `Brand approved by admin`;
      case 'brand_rejected': return `Brand rejected by admin`;
      case 'creator_signup': return `Creator @${event.details?.handle ?? 'unknown'} signed up`;
      case 'creator_verified': return `Creator verified by admin`;
      case 'inquiry_sent': return `Inquiry: ${event.details?.brand_name ?? 'Brand'} sent inquiry`;
      case 'contact_form': return `Contact form from ${event.details?.email ?? 'unknown'}`;
      default: return event.event_type;
    }
  }

  if (loading) return <div style={{ color: '#9CA3AF', fontSize: '14px' }}>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 24px 0', letterSpacing: '-0.02em' }}>
        Dashboard Overview
      </h1>

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {statCard('Creators in DB', stats.totalCreators)}
        {statCard('Brands Signed Up', stats.totalBrands)}
        {statCard('Pending Brand Approvals', stats.pendingBrands, true)}
        {statCard('Pending Creator Claims', stats.pendingCreators, true)}
        {statCard('Total Inquiries', stats.totalInquiries)}
        {statCard('Contact Messages', stats.contactMsgs)}
        {statCard('Embedded Creators', stats.embeddedCreators)}
      </div>

      {/* Recent activity */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 20px 0' }}>
          Recent Activity
        </h2>
        {activity.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>No activity yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activity.map((event) => (
              <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7C3AED', flexShrink: 0 }} />
                <p style={{ flex: 1, fontSize: '14px', color: '#374151', margin: 0 }}>{activityLabel(event)}</p>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0, flexShrink: 0 }}>
                  {new Date(event.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

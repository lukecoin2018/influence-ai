'use client';

// app/creator-dashboard/page.tsx

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCount } from '@/lib/formatters';

export default function CreatorDashboardPage() {
  const { user, creatorProfile, userRole, loading } = useAuth();

  const [creatorData, setCreatorData] = useState<any>(null);
  const [socialProfiles, setSocialProfiles] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Load data once we have the creator profile
  useEffect(() => {
    if (!creatorProfile || !creatorProfile.creator_id) {
      setDataLoading(false); // ← this line belongs here
      return;
    }
    const creatorId = creatorProfile.creator_id;

    async function loadData() {
      setDataLoading(true);
      const [creatorRes, socialRes, inquiryRes] = await Promise.all([
        supabase.from('v_creator_summary').select('*').eq('creator_id', creatorId).single(),
        supabase.from('social_profiles').select('*').eq('creator_id', creatorId),
        supabase.from('inquiries')
          .select('id, campaign_type, budget_range, created_at, brand_profiles(company_name)')
          .eq('creator_id', creatorId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      setCreatorData(creatorRes.data ?? null);
      setSocialProfiles(socialRes.data ?? []);
      setInquiries(inquiryRes.data ?? []);
      setDataLoading(false);
    }

    loadData();
  }, [creatorProfile?.creator_id]);

  // Auth guard — synchronous checks to prevent race condition redirect loop
  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9CA3AF' }}>Loading...</p></div>;
  if (!user) { window.location.href = '/login'; return null; }
  if (userRole !== 'creator') { window.location.href = '/dashboard'; return null; }

  // Show nothing while data is loading
  if (dataLoading || !creatorProfile) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA' }} />;
  }

  const primaryProfile = socialProfiles.find((p) => p.platform === 'instagram') ?? socialProfiles[0];
  const enrichment = primaryProfile?.enrichment_data as any;
  const aiSummary = socialProfiles.find((p) => p.ai_summary)?.ai_summary ?? null;

  const displayBio = creatorProfile.custom_bio ?? aiSummary ?? primaryProfile?.bio ?? null;
  const handle = creatorData?.instagram_handle ?? creatorData?.tiktok_handle ?? '';

  const isVerified = creatorProfile.claim_status === 'verified';
  const isPending = creatorProfile.claim_status === 'pending';

  const statCard = (label: string, value: string) => (
    <div style={{ backgroundColor: '#F9FAFB', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
      <p style={{ fontSize: '20px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 4px 0' }}>{value}</p>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto px-6" style={{ paddingTop: '40px', paddingBottom: '80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              Your Profile
            </h1>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', backgroundColor: isVerified ? '#ECFDF5' : '#FFFBEB', border: `1px solid ${isVerified ? '#A7F3D0' : '#FDE68A'}` }}>
              <span>{isVerified ? '✅' : '⏳'}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: isVerified ? '#065F46' : '#92400E' }}>
                {isVerified ? 'Verified' : isPending ? 'Pending Verification' : 'Unclaimed'}
              </span>
            </div>
          </div>
          <Link
            href="/creator-dashboard/edit"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', backgroundColor: '#FFD700', color: '#3A3A3A', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
          >
            ✏️ Edit Profile
          </Link>
        </div>

        {/* ── Profile Preview ─────────────────────────────────────────── */}
        <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px 0' }}>
            Profile Preview
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FFF0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#FF4D94' }}>
                {(creatorData?.name ?? handle ?? '?').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 2px 0' }}>
                {creatorProfile.display_name ?? creatorData?.name ?? `@${handle}`}
              </p>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 8px 0' }}>@{handle}</p>
              {creatorData?.city && creatorData?.country && (
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 8px 0' }}>
                  📍 {creatorData.city}, {creatorData.country}
                </p>
              )}
              {displayBio && (
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: 0 }}>{displayBio}</p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            <Link href={`/creators/${handle}`} target="_blank" style={{ fontSize: '13px', fontWeight: 600, color: '#FF4D94', textDecoration: 'none', padding: '7px 14px', border: '1px solid #FFB3D1', borderRadius: '8px' }}>
              View Public Profile ↗
            </Link>
            <Link href="/creator-dashboard/edit" style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', textDecoration: 'none', padding: '7px 14px', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
              Edit Profile
            </Link>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────── */}
        {creatorData && (
          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px 0' }}>
              Your Stats
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
              {statCard('Followers', formatCount(creatorData.total_followers))}
              {enrichment?.calculated_engagement_rate != null && statCard('Engagement', `${enrichment.calculated_engagement_rate.toFixed(1)}%`)}
              {enrichment?.posting_frequency_per_week != null && statCard('Posts/week', enrichment.posting_frequency_per_week.toFixed(1))}
              {enrichment?.avg_likes != null && statCard('Avg Likes', formatCount(enrichment.avg_likes))}
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '14px 0 0 0' }}>
              These stats are updated automatically from your public profile.
            </p>
          </div>
        )}

        {/* ── Brand Interest ──────────────────────────────────────────── */}
        <div className="card" style={{ padding: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px 0' }}>
            Brand Interest
          </p>

          {!isVerified ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#3A3A3A', margin: '0 0 6px 0' }}>
                {inquiries.length > 0
                  ? `${inquiries.length} brand${inquiries.length !== 1 ? 's have' : ' has'} expressed interest in your profile`
                  : 'Brands can find you here'}
              </p>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                {isPending
                  ? 'Your profile is pending verification. Full details will be visible once verified.'
                  : 'Claim your profile to see full details.'}
              </p>
            </div>
          ) : inquiries.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>No brand inquiries yet. Make sure your profile is complete to attract brands.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {inquiries.map((inq: any) => (
                <div key={inq.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                  <span style={{ fontSize: '20px' }}>🏢</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#3A3A3A', margin: '0 0 2px 0' }}>
                      {inq.brand_profiles?.company_name ?? 'A brand'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                      {inq.campaign_type ?? 'Campaign'}{inq.budget_range ? ` · ${inq.budget_range}` : ''}
                    </p>
                  </div>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0, flexShrink: 0 }}>
                    {new Date(inq.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

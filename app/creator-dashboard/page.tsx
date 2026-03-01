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

  useEffect(() => {
    if (!creatorProfile || !creatorProfile.creator_id) {
      setDataLoading(false);
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#9CA3AF' }}>Loading...</p>
    </div>
  );
  if (!user) { window.location.href = '/login'; return null; }
  if (userRole !== 'creator') { window.location.href = '/dashboard'; return null; }
  if (dataLoading || !creatorProfile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#9CA3AF' }}>Loading your dashboard...</p>
    </div>
  );

  const primaryProfile = socialProfiles.find(p => p.platform === 'instagram') ?? socialProfiles[0];
  const enrichment = primaryProfile?.enrichment_data as any;
  const aiSummary = socialProfiles.find(p => p.ai_summary)?.ai_summary ?? null;
  const displayBio = creatorProfile.custom_bio ?? aiSummary ?? primaryProfile?.bio ?? null;
  const handle = creatorData?.instagram_handle ?? creatorData?.tiktok_handle ?? '';
  const isVerified = creatorProfile.claim_status === 'verified';
  const isPending = creatorProfile.claim_status === 'pending';
  const displayName = creatorProfile.display_name ?? creatorData?.name ?? `@${handle}`;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div style={{ maxWidth: '900px' }}>

      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
          Welcome back, {displayName.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          Here's an overview of your creator profile and tools.
        </p>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      {creatorData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Followers', value: formatCount(creatorData.total_followers), icon: '👥', color: '#3AAFF4' },
            { label: 'Engagement', value: enrichment?.calculated_engagement_rate != null ? `${enrichment.calculated_engagement_rate.toFixed(1)}%` : '—', icon: '📈', color: '#FF4D94' },
            { label: 'Avg Likes', value: enrichment?.avg_likes != null ? formatCount(enrichment.avg_likes) : '—', icon: '❤️', color: '#FFD700' },
            { label: 'Brand Inquiries', value: inquiries.length.toString(), icon: '🏢', color: '#10B981' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{
              backgroundColor: '#fff', borderRadius: '14px', padding: '18px',
              border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px' }}>{icon}</span>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
              </div>
              <p style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 2px 0', letterSpacing: '-0.02em' }}>{value}</p>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Two column layout ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Profile card */}
        <div style={{
          backgroundColor: '#fff', borderRadius: '16px', padding: '24px',
          border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          gridColumn: '1 / -1',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                Profile Preview
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '3px 10px', borderRadius: '999px',
                backgroundColor: isVerified ? '#ECFDF5' : '#FFFBEB',
                border: `1px solid ${isVerified ? '#A7F3D0' : '#FDE68A'}`,
              }}>
                <span style={{ fontSize: '11px' }}>{isVerified ? '✅' : '⏳'}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: isVerified ? '#065F46' : '#92400E' }}>
                  {isVerified ? 'Verified' : isPending ? 'Pending' : 'Unclaimed'}
                </span>
              </div>
            </div>
            <Link href="/creator-dashboard/edit" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '8px', backgroundColor: '#FFD700',
              color: '#3A3A3A', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
            }}>
              ✏️ Edit Profile
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              backgroundColor: '#FFF0F5', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: '17px', fontWeight: 700, color: '#FF4D94' }}>{initials}</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 2px 0' }}>{displayName}</p>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 6px 0' }}>@{handle}</p>
              {creatorData?.city && creatorData?.country && (
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 8px 0' }}>
                  📍 {creatorData.city}, {creatorData.country}
                </p>
              )}
              {displayBio && (
                <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {displayBio}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F3F4F6', flexWrap: 'wrap' }}>
            <Link href={`/creators/${handle}`} target="_blank" style={{
              fontSize: '13px', fontWeight: 600, color: '#FF4D94', textDecoration: 'none',
              padding: '6px 14px', border: '1px solid #FFB3D1', borderRadius: '8px',
            }}>
              View Public Profile ↗
            </Link>
            <Link href="/creator-dashboard/edit" style={{
              fontSize: '13px', fontWeight: 600, color: '#6B7280', textDecoration: 'none',
              padding: '6px 14px', border: '1px solid #E5E7EB', borderRadius: '8px',
            }}>
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* ── Creator Tools ──────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '16px', padding: '24px',
        border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        marginBottom: '16px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px 0' }}>
          Creator Tools
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {[
            { href: '/creator-dashboard/calculator', icon: '🧮', title: 'Rate Calculator', desc: 'Calculate your fair market rate based on your stats and deliverables', color: '#3AAFF4', bg: '#EFF6FF' },
            { href: '/creator-dashboard/negotiate', icon: '🤝', title: 'Negotiation Assistant', desc: 'Get personalized email templates to close better brand deals', color: '#FF4D94', bg: '#FFF0F5' },
            { href: '/creator-dashboard/contract', icon: '📄', title: 'Contract Builder', desc: 'Generate a professional contract for your next collaboration', color: '#FFD700', bg: '#FFFBEB' },
          ].map(({ href, icon, title, desc, color, bg }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '20px', borderRadius: '12px', backgroundColor: bg,
                border: `1px solid ${color}30`, transition: 'transform 0.15s, box-shadow 0.15s',
                cursor: 'pointer', height: '100%',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  backgroundColor: '#fff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: '12px', fontSize: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                  {icon}
                </div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 6px 0' }}>{title}</p>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 14px 0', lineHeight: '1.5' }}>{desc}</p>
                <span style={{ fontSize: '12px', fontWeight: 600, color: color }}>Open tool →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Brand Interest ─────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '16px', padding: '24px',
        border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px 0' }}>
          Brand Interest
        </p>

        {!isVerified ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏢</div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#3A3A3A', margin: '0 0 6px 0' }}>
              {inquiries.length > 0
                ? `${inquiries.length} brand${inquiries.length !== 1 ? 's have' : ' has'} expressed interest`
                : 'Brands can find you here'}
            </p>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
              {isPending
                ? 'Your profile is pending verification. Full details will be visible once verified.'
                : 'Claim your profile to see full details.'}
            </p>
          </div>
        ) : inquiries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
              No brand inquiries yet. Make sure your profile is complete to attract brands.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {inquiries.map((inq: any) => (
              <div key={inq.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', backgroundColor: '#F9FAFB', borderRadius: '10px',
                border: '1px solid #F3F4F6',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0, fontSize: '18px',
                }}>
                  🏢
                </div>
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
  );
}

// app/creator-dashboard/page.tsx
// Creator dashboard — shown after creator login
// Shows: profile preview, stats, rates, brand interest

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { formatCount } from '@/lib/formatters';

export default async function CreatorDashboardPage() {

  // Auth check — uses cookie-based client so session is available server-side
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Creator profile
  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  // Creator data from main creators table
  const { data: creatorData } = await supabase
    .from('v_creator_summary')
    .select('*')
    .eq('creator_id', creatorProfile?.creator_id)
    .single();

  // Social profiles for enrichment data
  const { data: socialProfiles } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('creator_id', creatorProfile?.creator_id);

  // Brand inquiries
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, campaign_type, budget_range, created_at, brand_profiles(company_name)')
    .eq('creator_id', creatorProfile?.creator_id)
    .order('created_at', { ascending: false })
    .limit(10);

  const primaryProfile = (socialProfiles ?? []).find((p: any) => p.platform === 'instagram')
    ?? (socialProfiles ?? [])[0];
  const enrichment = primaryProfile?.enrichment_data as any;
  const aiSummary = (socialProfiles ?? []).find((p: any) => p.ai_summary)?.ai_summary ?? null;

  // What to display as bio/description
  const displayBio = creatorProfile?.custom_bio ?? aiSummary ?? primaryProfile?.bio ?? null;
  const handle = creatorData?.instagram_handle ?? creatorData?.tiktok_handle ?? '';

  const isVerified = creatorProfile?.claim_status === 'verified';
  const isPending = creatorProfile?.claim_status === 'pending';

  const statCard = (label: string, value: string) => (
    <div style={{ backgroundColor: '#F9FAFB', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
      <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>{value}</p>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto px-6" style={{ paddingTop: '40px', paddingBottom: '80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#111827', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', backgroundColor: '#7C3AED', color: 'white', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
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
            {/* Avatar */}
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#7C3AED' }}>
                {(creatorData?.name ?? handle ?? '?').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 2px 0' }}>
                {creatorProfile?.display_name ?? creatorData?.name ?? `@${handle}`}
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
            <Link href={`/creators/${handle}`} target="_blank" style={{ fontSize: '13px', fontWeight: 600, color: '#7C3AED', textDecoration: 'none', padding: '7px 14px', border: '1px solid #DDD6FE', borderRadius: '8px' }}>
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

        {/* ── Rates & Availability ────────────────────────────────────── */}
        <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Rates & Availability
            </p>
            <Link href="/creator-dashboard/edit" style={{ fontSize: '12px', fontWeight: 600, color: '#7C3AED', textDecoration: 'none' }}>
              Edit Rates
            </Link>
          </div>

          {creatorProfile?.rate_post || creatorProfile?.rate_reel || creatorProfile?.rate_story ? (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {creatorProfile.rate_post && <RatePill label="Post" amount={creatorProfile.rate_post} currency={creatorProfile.rate_currency ?? 'USD'} />}
              {creatorProfile.rate_reel && <RatePill label="Reel" amount={creatorProfile.rate_reel} currency={creatorProfile.rate_currency ?? 'USD'} />}
              {creatorProfile.rate_story && <RatePill label="Story" amount={creatorProfile.rate_story} currency={creatorProfile.rate_currency ?? 'USD'} />}
              {creatorProfile.rate_package && <RatePill label="Package" amount={creatorProfile.rate_package} currency={creatorProfile.rate_currency ?? 'USD'} />}
            </div>
          ) : (
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '0 0 12px 0' }}>No rates set yet.</p>
          )}

          <AvailabilityBadge status={creatorProfile?.availability_status ?? 'open'} />
          {creatorProfile?.availability_note && (
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '8px 0 0 0' }}>{creatorProfile.availability_note}</p>
          )}
          {creatorProfile?.rate_notes && (
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '6px 0 0 0', fontStyle: 'italic' }}>"{creatorProfile.rate_notes}"</p>
          )}
        </div>

        {/* ── Brand Interest ──────────────────────────────────────────── */}
        <div className="card" style={{ padding: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px 0' }}>
            Brand Interest
          </p>

          {!isVerified ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 6px 0' }}>
                {(inquiries ?? []).length > 0
                  ? `${inquiries!.length} brand${inquiries!.length !== 1 ? 's have' : ' has'} expressed interest in your profile`
                  : 'Brands can find you here'}
              </p>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                {isPending
                  ? 'Your profile is pending verification. Full details will be visible once verified.'
                  : 'Claim your profile to see full details.'}
              </p>
            </div>
          ) : (inquiries ?? []).length === 0 ? (
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>No brand inquiries yet. Make sure your profile is complete to attract brands.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {inquiries!.map((inq: any) => (
                <div key={inq.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                  <span style={{ fontSize: '20px' }}>🏢</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 2px 0' }}>
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

// ── Helper components ─────────────────────────────────────────────────────────

function RatePill({ label, amount, currency }: { label: string; amount: number; currency: string }) {
  return (
    <div style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: '#F3F4F6', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
        {currency === 'USD' ? '$' : currency}{Number(amount).toLocaleString()}
      </span>
    </div>
  );
}

function AvailabilityBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    open:          { color: '#065F46', bg: '#ECFDF5', label: '🟢 Open to collaborations' },
    limited:       { color: '#92400E', bg: '#FFFBEB', label: '🟡 Limited availability' },
    booked:        { color: '#991B1B', bg: '#FEF2F2', label: '🔴 Currently booked' },
    not_available: { color: '#6B7280', bg: '#F3F4F6', label: '⚫ Not available' },
  };
  const c = config[status] ?? config.open;
  return (
    <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '999px', backgroundColor: c.bg, fontSize: '12px', fontWeight: 600, color: c.color }}>
      {c.label}
    </span>
  );
}

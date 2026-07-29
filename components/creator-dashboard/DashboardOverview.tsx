'use client';

// components/creator-dashboard/DashboardOverview.tsx
// Pure presentational Overview — no auth/session access, no data fetching.
// Used by both app/creator-dashboard/page.tsx (real creator session) and
// app/admin/preview/creator/[handle]/page.tsx (admin read-only preview), so
// the two never drift into separate copies of the same screen.

import Link from 'next/link';
import { formatCount } from '@/lib/formatters';
import { categoryBucketLabel, nicheLeadBucket, orderCategoriesForDisplay, summarizeCategories, type CategoryCount } from '@/lib/reports/category-consolidation';
import type { CreatorBrandMatches } from '@/lib/reports/creator-brand-matches';
import { getDashboardStrings } from '@/lib/i18n/dashboard-strings';
import type { Locale } from '@/app/claim/[handle]/_strings';

const PINK = '#FF4D94';

type OverviewStrings = ReturnType<typeof getDashboardStrings>['overview'];

interface DashboardOverviewProps {
  // null for an unclaimed creator being previewed — degrade to scraped
  // creatorData/socialProfiles fields rather than crashing on a missing row.
  creatorProfile: {
    creator_id: string;
    claim_status: string;
    custom_bio: string | null;
    display_name: string | null;
  } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creatorData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socialProfiles: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inquiries: any[];
  brandMatches: CreatorBrandMatches | null;
  brandsHiringHref: string;
  /**
   * Passed in rather than resolved here, because this component is shared with
   * the admin preview (app/admin/preview/creator/[handle]/page.tsx), which
   * renders it from a force-dynamic SERVER component. Calling useLocale() in
   * here would break the props-only contract in the header above, and in the
   * preview it would read the ADMIN's creator_profiles row — which does not
   * exist, so it would land on 'en' by accident rather than by choice. The
   * preview passes 'en' explicitly instead.
   *
   * Defaults to 'en' so any caller that has not been updated is unaffected.
   */
  locale?: Locale;
}

function BrandsHiringHero({ totalMatchCount, categories, brandsHiringHref, locale, t }: { totalMatchCount: number; categories: CategoryCount[]; brandsHiringHref: string; locale: Locale; t: OverviewStrings }) {
  const shown = categories.slice(0, 4);
  const moreCount = categories.length - shown.length;

  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: '16px', padding: '24px',
      border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      marginBottom: '24px',
    }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>
        {t.brandsHiringEyebrow}
      </p>
      {totalMatchCount === 0 ? (
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          {t.heroZero}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#3A3A3A', margin: 0, letterSpacing: '-0.01em' }}>
            {/* Two keys, not one: the count has to stay inside its own pink
                span, so the sentence is split around it. Same decomposition as
                the teaser headline (_strings.ts headline.brandWord + suffix). */}
            <span style={{ color: PINK }}>{totalMatchCount}</span> {t.heroBrandWord(totalMatchCount)} {t.heroSuffix}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {shown.map((c) => (
              <span key={c.name} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px',
                backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '13px', fontWeight: 600, color: '#3A3A3A',
              }}>
                {/* DISPLAY label only. `c.name` stays the canonical English
                    bucket everywhere it is used as an identity (filtering,
                    niche-lead matching) — see BrandsHiring.tsx. */}
                <strong style={{ fontWeight: 800, color: PINK }}>{c.count}</strong> {categoryBucketLabel(c.name, locale)}
              </span>
            ))}
            {moreCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '13px', fontWeight: 600, color: '#9CA3AF' }}>
                {t.moreCategories(moreCount)}
              </span>
            )}
          </div>
          <Link href={brandsHiringHref} style={{
            fontSize: '13px', fontWeight: 700, color: PINK, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}>
            {t.viewAll}
          </Link>
        </div>
      )}
    </div>
  );
}

export function DashboardOverview({ creatorProfile, creatorData, socialProfiles, inquiries, brandMatches, brandsHiringHref, locale = 'en' }: DashboardOverviewProps) {
  const t = getDashboardStrings(locale).overview;
  const primaryProfile = socialProfiles.find(p => p.platform === 'instagram') ?? socialProfiles[0];
  const enrichment = primaryProfile?.enrichment_data as any;
  const aiSummary = socialProfiles.find(p => p.ai_summary)?.ai_summary ?? null;
  const displayBio = creatorProfile?.custom_bio ?? aiSummary ?? primaryProfile?.bio ?? null;
  const handle = creatorData?.instagram_handle ?? creatorData?.tiktok_handle ?? '';
  const isVerified = creatorProfile?.claim_status === 'verified';
  const isPending = creatorProfile?.claim_status === 'pending';
  const displayName = creatorProfile?.display_name ?? creatorData?.name ?? `@${handle}`;
  const initials = displayName.slice(0, 2).toUpperCase();

  const detectedNiche = primaryProfile?.detected_niche ?? null;
  const brandCategories = brandMatches ? orderCategoriesForDisplay(summarizeCategories(brandMatches.matches), nicheLeadBucket(detectedNiche)) : [];

  return (
    <div style={{ maxWidth: '900px' }}>

      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
          {t.welcome(displayName.split(' ')[0])}
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          {t.subtitle}
        </p>
      </div>

      {/* ── Brands Hiring hero — outbound discovery, distinct from the ── */}
      {/* ── inbound "Brand Interest" section further down.             ── */}
      <BrandsHiringHero
        totalMatchCount={brandMatches?.totalMatchCount ?? 0}
        categories={brandCategories}
        brandsHiringHref={brandsHiringHref}
        locale={locale}
        t={t}
      />

      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      {creatorData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: t.statFollowers, value: formatCount(creatorData.total_followers), icon: '👥', color: '#3AAFF4' },
            { label: t.statEngagement, value: enrichment?.calculated_engagement_rate != null ? `${enrichment.calculated_engagement_rate.toFixed(1)}%` : '—', icon: '📈', color: '#FF4D94' },
            { label: t.statAvgLikes, value: enrichment?.avg_likes != null ? formatCount(enrichment.avg_likes) : '—', icon: '❤️', color: '#FFD700' },
            { label: t.statBrandInquiries, value: inquiries.length.toString(), icon: '🏢', color: '#10B981' },
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
                {t.profilePreview}
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '3px 10px', borderRadius: '999px',
                backgroundColor: isVerified ? '#ECFDF5' : '#FFFBEB',
                border: `1px solid ${isVerified ? '#A7F3D0' : '#FDE68A'}`,
              }}>
                <span style={{ fontSize: '11px' }}>{isVerified ? '✅' : '⏳'}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: isVerified ? '#065F46' : '#92400E' }}>
                  {isVerified ? t.statusVerified : isPending ? t.statusPending : t.statusUnclaimed}
                </span>
              </div>
            </div>
            {/* English in both locales — it names the Edit Profile tool, and
                that page is still English. Same rule as the sidebar's five
                tool labels; see lib/i18n/dashboard-strings.ts's header. */}
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
              {t.viewPublicProfile}
            </Link>
            {/* English in both locales — Edit Profile tool again, as above. */}
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
      {/* ENGLISH IN BOTH LOCALES, as one block: the heading, the three titles,
          the three descriptions and the "Open tool →" CTA all name or describe
          the legacy tools that stay English. An English heading over English
          content reads as deliberate; a Spanish CTA into an English tool reads
          as broken. This block becomes translatable when the tools do. */}
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
          {t.brandInterest}
        </p>

        {!isVerified ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏢</div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#3A3A3A', margin: '0 0 6px 0' }}>
              {/* One whole sentence per locale. The English form pulled the verb
                  into the plural marker ("s have" / " has"), which no key swap
                  survives — Spanish conjugates it separately ("ha" / "han"). */}
              {inquiries.length > 0
                ? t.inquiriesInterest(inquiries.length)
                : t.brandsCanFindYou}
            </p>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
              {isPending
                ? t.pendingVerificationBody
                : t.claimToSeeDetails}
            </p>
          </div>
        ) : inquiries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
              {t.noInquiries}
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
                    {inq.brand_profiles?.company_name ?? t.brandFallback}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                    {inq.campaign_type ?? t.campaignFallback}{inq.budget_range ? ` · ${inq.budget_range}` : ''}
                  </p>
                </div>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0, flexShrink: 0 }}>
                  {/* Was a hardcoded 'en-GB', which left an English "5 Aug" in an
                      otherwise Spanish list. Not copy, so it lives in the table
                      as a BCP-47 tag beside the strings it has to agree with. */}
                  {new Date(inq.created_at).toLocaleDateString(t.inquiryDateLocale, { day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

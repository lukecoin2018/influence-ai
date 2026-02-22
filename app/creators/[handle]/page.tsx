import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { EngagementIndicator } from '@/components/EngagementIndicator';
import { CategoryBadge } from '@/components/CategoryBadge';
import { formatCount, formatFollowerRatio, formatDate, cleanDiscoveryTags } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';
import type { CreatorDetail, SocialProfile, EnrichmentData } from '@/lib/types';
import { SaveToShortlist } from '@/components/SaveToShortlist';
import { GetInTouchButton } from '@/components/GetInTouchButton';
import { AiSummaryCard } from '@/components/creator/AiSummaryCard';
import { LocationBadge, LanguageBadge } from '@/components/creator/IntelligenceBadges';
import { ContactEmail } from '@/components/creator/ContactEmail';

async function getCreator(handle: string): Promise<CreatorDetail | null> {
  const { data: profile } = await supabase
    .from('social_profiles')
    .select('creator_id')
    .eq('handle', handle)
    .limit(1)
    .single();

  if (!profile) return null;

  const { data: creator } = await supabase
    .from('creators')
    .select('*')
    .eq('id', profile.creator_id)
    .single();

  if (!creator) return null;

  const { data: profiles } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('creator_id', profile.creator_id);

  const { data: summary } = await supabase
    .from('v_creator_summary')
    .select('*')
    .eq('creator_id', profile.creator_id)
    .single();

    const { data: claimedProfile } = await supabase
    .from('creator_profiles')
    .select('display_name, custom_bio, rate_post, rate_reel, rate_story, rate_package, rate_currency, rate_notes, availability_status, availability_note, claim_status')
    .eq('creator_id', profile.creator_id)
    .eq('claim_status', 'verified')
    .maybeSingle();

  const aiSummaryFromProfile = 
  (profiles ?? []).find((p: any) => p.ai_summary)?.ai_summary ?? null;

return { ...creator, ...summary, ai_summary: aiSummaryFromProfile, city: creator.city ?? null, country: creator.country ?? null, primary_language: creator.primary_language ?? null, contact_email: creator.contact_email ?? null, claimed_profile: claimedProfile ?? null, social_profiles: profiles ?? [] } as CreatorDetail;return { ...creator, ...summary, ai_summary: aiSummaryFromProfile, city: creator.city ?? null, country: creator.country ?? null, primary_language: creator.primary_language ?? null, contact_email: creator.contact_email ?? null, social_profiles: profiles ?? [] } as CreatorDetail;
}

async function getSimilarCreators(creatorId: string, category: string | null, totalFollowers: number): Promise<any[]> {
  // Try vector similarity first
  const { data: creator } = await supabase
    .from('creators')
    .select('embedding')
    .eq('id', creatorId)
    .single();

  if (creator?.embedding) {
    const { data: matches } = await supabase.rpc('match_creators', {
      query_embedding: creator.embedding,
      match_count: 7,
      similarity_threshold: 0.4,
    });

    if (matches && matches.length > 0) {
      const ids = matches
        .filter((m: any) => m.creator_id !== creatorId)
        .map((m: any) => m.creator_id)
        .slice(0, 6);

      if (ids.length > 0) {
        const { data: similar } = await supabase
          .from('v_creator_summary')
          .select('*')
          .in('creator_id', ids);

        if (similar && similar.length > 0) return similar;
      }
    }
  }

  // Fallback to category/follower matching
  if (!category) {
    const { data } = await supabase
      .from('v_creator_summary')
      .select('*')
      .neq('creator_id', creatorId)
      .gte('total_followers', totalFollowers * 0.5)
      .lte('total_followers', totalFollowers * 1.5)
      .limit(6);
    return data ?? [];
  }

  const { data: catProfiles } = await supabase
    .from('social_profiles')
    .select('creator_id')
    .eq('platform_data->>category_name', category)
    .neq('creator_id', creatorId);

  const ids = (catProfiles ?? []).map((p) => p.creator_id).slice(0, 20);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from('v_creator_summary')
    .select('*')
    .in('creator_id', ids)
    .limit(6);

  return data ?? [];
}

function ActivityBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  const config = days < 7
    ? { color: '#059669', bg: '#ECFDF5', label: 'Active' }
    : days <= 30
    ? { color: '#D97706', bg: '#FFFBEB', label: 'Moderately active' }
    : { color: '#DC2626', bg: '#FEF2F2', label: 'Inactive' };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', backgroundColor: config.bg }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: config.color, flexShrink: 0 }} />
      <span style={{ fontSize: '12px', fontWeight: 600, color: config.color }}>{config.label}</span>
    </div>
  );
}

function ContentMixBar({ mix }: { mix: Record<string, number> }) {
  const colors: Record<string, string> = {
    Video:    '#FF4D94',
    Reel:     '#FF4D94',
    Sidecar:  '#3AAFF4',
    Carousel: '#3AAFF4',
    Image:    '#FFD700',
    Photo:    '#FFD700',
  };

  const displayNames: Record<string, string> = {
    Sidecar: 'Carousel',
  };

  const defaultColor = '#FFE44D';
  const entries = Object.entries(mix).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;
  return (
    <div>
      <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', height: '32px', gap: '2px' }}>
        {entries.map(([type, pct]) => (
          <div key={type} style={{ flex: pct, backgroundColor: colors[type] ?? defaultColor, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: pct > 10 ? 'auto' : '0' }}>
            {pct > 10 && <span style={{ fontSize: '11px', fontWeight: 600, color: 'white' }}>{displayNames[type] ?? type} {pct}%</span>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px' }}>
        {entries.map(([type, pct]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: colors[type] ?? defaultColor, flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#6B7280' }}>{displayNames[type] ?? type} <strong style={{ color: '#3A3A3A' }}>{pct}%</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EngagementColor(rate: number | null): string {
  if (rate === null) return '#9CA3AF';
  if (rate >= 4) return '#059669';
  if (rate >= 2) return '#D97706';
  return '#DC2626';
}

function ContentAnalytics({ enrichment, enrichedAt }: { enrichment: EnrichmentData; enrichedAt: string | null }) {
  const {
    calculated_engagement_rate, posting_frequency_per_week,
    avg_likes, avg_views, avg_comments, content_mix,
    top_hashtags, days_since_last_post,
    sponsored_posts_count, detected_brands, brand_partnership_count,
  } = enrichment;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Content Analytics</h2>
          <ActivityBadge days={days_since_last_post} />
        </div>
        {enrichedAt && (
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
            Data calculated {formatDate(enrichedAt)}
          </span>
        )}
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {calculated_engagement_rate != null && (
          <div style={{ backgroundColor: '#F9FAFB', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px 0' }}>Engagement Rate</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: EngagementColor(calculated_engagement_rate), margin: '0 0 2px 0' }}>{calculated_engagement_rate.toFixed(1)}%</p>
            <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>Calculated from recent posts</p>
          </div>
        )}
        {posting_frequency_per_week != null && (
          <div style={{ backgroundColor: '#F9FAFB', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px 0' }}>Posting Frequency</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>{posting_frequency_per_week.toFixed(1)}<span style={{ fontSize: '13px', fontWeight: 500, color: '#6B7280' }}> /week</span></p>
          </div>
        )}
        {avg_likes != null && (
          <div style={{ backgroundColor: '#F9FAFB', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px 0' }}>Avg Likes</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>{formatCount(avg_likes)}</p>
          </div>
        )}
        {avg_views != null && avg_views > 0 && (
          <div style={{ backgroundColor: '#F9FAFB', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px 0' }}>Avg Views</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>{formatCount(avg_views)}</p>
          </div>
        )}
        {avg_comments != null && (
          <div style={{ backgroundColor: '#F9FAFB', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px 0' }}>Avg Comments</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>{formatCount(avg_comments)}</p>
          </div>
        )}
      </div>

      {/* Content mix */}
      {content_mix && Object.keys(content_mix).length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#3A3A3A', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Content Mix</h3>
          <ContentMixBar mix={content_mix} />
        </div>
      )}

      {/* Top hashtags */}
      {top_hashtags && top_hashtags.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#3A3A3A', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top Hashtags</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {top_hashtags.slice(0, 10).map((tag) => (
              <span key={tag} style={{ padding: '4px 12px', borderRadius: '999px', backgroundColor: '#F3F4F6', color: '#3A3A3A', fontSize: '13px', fontWeight: 500 }}>
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Brand partnerships */}
      {sponsored_posts_count != null && sponsored_posts_count > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#3A3A3A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Brand Partnerships Detected</h3>
            <span style={{ padding: '2px 8px', borderRadius: '999px', backgroundColor: '#FFF9E0', color: '#FFD700', fontSize: '12px', fontWeight: 700 }}>{brand_partnership_count}</span>
          </div>
          {detected_brands && detected_brands.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {detected_brands.map((brand) => (
                <span key={brand} style={{ padding: '4px 12px', borderRadius: '8px', backgroundColor: '#F3F4F6', color: '#374151', fontSize: '13px', fontWeight: 500, textTransform: 'capitalize' }}>
                  {brand}
                </span>
              ))}
            </div>
          )}
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>Based on analysis of recent posts</p>
        </div>
      )}
    </div>
  );
}

function AvatarFallback({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: '96px', height: '96px', borderRadius: '50%', backgroundColor: '#FFF0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: '28px', fontWeight: 700, color: '#FF4D94' }}>{initials}</span>
    </div>
  );
}

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
    </svg>
  );
}

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.05a8.16 8.16 0 004.77 1.52V7.12a4.85 4.85 0 01-1-.43z"/>
    </svg>
  );
}

function MetricCard({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '20px 24px', textAlign: 'center', flex: '1 1 120px' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px 0' }}>{label}</p>
      <div style={{ fontSize: '20px', fontWeight: 700, color: '#3A3A3A' }}>{value}</div>
    </div>
  );
}

function PlatformMetrics({ profile }: { profile: SocialProfile }) {
  const isPlatformInstagram = profile.platform === 'instagram';

  // Build the fourth metric card conditionally
  const fourthMetric = (() => {
    if (profile.platform === 'tiktok') {
      const likes = profile.platform_data?.likes_count;
      if (!likes || likes === 0) return null;
      return { label: 'Total Likes', value: formatCount(likes) };
    } else {
      let category = profile.platform_data?.category_name;
      if (!category || category === 'None') return null;
      if (category.startsWith('None,')) category = category.slice(5).trim();
      return { label: 'Category', value: category };
    }
  })();

  const baseMetrics = [
    { label: 'Followers', value: formatCount(profile.follower_count) },
    { label: 'Following', value: formatCount(profile.following_count) },
    { label: 'Posts', value: formatCount(profile.posts_count) },
  ];

  const metrics = fourthMetric ? [...baseMetrics, fourthMetric] : baseMetrics;

  return (
    <div className="card" style={{ padding: '24px', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div style={{ color: isPlatformInstagram ? '#E1306C' : '#010101' }}>
          {isPlatformInstagram ? <InstagramIcon size={18} /> : <TikTokIcon size={18} />}
        </div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>
          {isPlatformInstagram ? 'Instagram' : 'TikTok'}
        </h3>
        <span style={{ fontSize: '13px', color: '#6B7280' }}>@{profile.handle}</span>
        {profile.profile_url && (
          <a href={profile.profile_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', color: '#FFD700', display: 'flex', alignItems: 'center' }}>
            <ExternalLink size={14} />
          </a>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {metrics.map(({ label, value }) => (
          <div key={label} style={{ backgroundColor: '#F9FAFB', borderRadius: '8px', padding: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px 0' }}>{label}</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>Engagement:</span>
        <EngagementIndicator rate={profile.engagement_rate} showLabel={false} size="sm" />
      </div>
    </div>
  );
}

function SimilarCreatorCard({ creator }: { creator: any }) {
  const handle = creator.instagram_handle ?? creator.tiktok_handle;
  const engagement = creator.instagram_engagement ?? creator.tiktok_engagement;
  if (!handle) return null;
  return (
    <Link href={`/creators/${handle}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#FFF9E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#FFD700' }}>
          {(creator.name ?? '??').slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#3A3A3A', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{creator.name}</p>
          <p style={{ fontSize: '11px', color: '#6B7280', margin: 0 }}>{formatCount(creator.total_followers)} followers</p>
        </div>
        <EngagementIndicator rate={engagement} showLabel={false} size="sm" />
      </div>
    </Link>
  );
}

function ClaimedBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '999px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', fontSize: '12px', fontWeight: 600, color: '#065F46' }}>
      ✅ Claimed Profile
    </span>
  );
}

function PublicAvailabilityBadge({ status }: { status: string }) {
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

function CreatorStructuredData({ creator, aiSummary }: { creator: any; aiSummary: string | null }) {
  const canonicalHandle = creator.instagram_handle || creator.tiktok_handle;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: creator.name || canonicalHandle,
    alternateName: `@${canonicalHandle}`,
    url: `https://influenceit.app/creators/${canonicalHandle}`,
    ...(aiSummary && { description: aiSummary }),
    jobTitle: 'Content Creator',
    sameAs: [
      creator.instagram_handle ? `https://instagram.com/${creator.instagram_handle}` : null,
      creator.tiktok_handle ? `https://tiktok.com/@${creator.tiktok_handle}` : null,
    ].filter(Boolean),
    ...(creator.country && {
      address: {
        '@type': 'PostalAddress',
        addressCountry: creator.country,
        ...(creator.city && { addressLocality: creator.city }),
      },
    }),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const creator = await getCreator(handle);
  if (!creator) return { title: 'Creator Not Found | InfluenceIT' };

  const name = creator.name || handle;
  const followers = creator.total_followers >= 1_000_000
    ? `${(creator.total_followers / 1_000_000).toFixed(1)}M`
    : `${(creator.total_followers / 1_000).toFixed(0)}K`;
  const platform = creator.primary_platform === 'tiktok' ? 'TikTok' : 'Instagram';
  const canonicalHandle = creator.instagram_handle || creator.tiktok_handle || handle;
  const desc = creator.ai_summary
    ? creator.ai_summary.slice(0, 160)
    : `${name} - ${platform} creator with ${followers} followers. View engagement analytics, content insights, and brand partnership history on InfluenceIT.`;

  return {
    title: `${name} (@${handle}) - ${platform} Creator | InfluenceIT`,
    description: desc,
    openGraph: {
      title: `${name} (@${handle}) - ${platform} Creator`,
      description: desc,
      type: 'profile',
      url: `https://influenceit.app/creators/${canonicalHandle}`,
    },
    twitter: {
      card: 'summary',
      title: `${name} (@${handle}) - ${platform} Creator`,
      description: desc,
    },
    alternates: {
      canonical: `https://influenceit.app/creators/${canonicalHandle}`,
    },
  };
}

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const creator = await getCreator(handle);
  if (!creator) notFound();

  // Check if user is logged in (for gated contact email)
  const { data: { session } } = await supabase.auth.getSession();
  const isLoggedIn = !!session;

  // Pull intelligence fields (all nullable — safe if missing)
  const aiSummary = creator.ai_summary ?? null;
  const city = creator.city ?? null;
  const country = creator.country ?? null;
  const primaryLanguage = creator.primary_language ?? null;
  const contactEmail = creator.contact_email ?? null;


  const instagramEnrichment = (creator.social_profiles?.find((p) => p.platform === 'instagram')?.enrichment_data ?? null) as EnrichmentData | null;
  const tiktokEnrichment = (creator.social_profiles?.find((p) => p.platform === 'tiktok')?.enrichment_data ?? null) as EnrichmentData | null;
  const primaryEnrichment = instagramEnrichment ?? tiktokEnrichment;
  const enrichedAt = creator.social_profiles?.find((p) => p.enriched_at !== null)?.enriched_at ?? null;
  const hasEnrichment = !!primaryEnrichment && Object.keys(primaryEnrichment).length > 0 && !!enrichedAt; 
  const socialProfiles = creator.social_profiles ?? [];
  const instagramProfile = socialProfiles.find((p) => p.platform === 'instagram');
  const tiktokProfile = socialProfiles.find((p) => p.platform === 'tiktok');
  const primaryProfile = instagramProfile ?? tiktokProfile;
  const category = primaryProfile?.platform_data?.category_name ?? null;
  const cleanCategory = category && category !== 'None' ? category : null;
  const bio = primaryProfile?.bio ?? null;
  const description = creator.ai_summary ?? bio ?? null;
  const website = primaryProfile?.website ?? null;
  const similarCreators = await getSimilarCreators(creator.creator_id, cleanCategory, creator.total_followers);
  const claimedProfile = (creator as any).claimed_profile ?? null;
  const isClaimed = claimedProfile?.claim_status === 'verified';

  return (
    <>
      <CreatorStructuredData creator={creator} aiSummary={creator.ai_summary ?? null} />
      <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: '32px', paddingBottom: '80px' }}>

        <Link href="/creators" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 500, marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6B7280' }}>
          <ArrowLeft size={16} />
          Back to Creators
        </Link>

        <div className="card" style={{ padding: '32px', marginBottom: '24px', marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <AvatarFallback name={creator.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#3A3A3A', margin: 0, letterSpacing: '-0.02em' }}>{creator.name}</h1>
                {(instagramProfile?.is_verified || tiktokProfile?.is_verified) && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {cleanCategory && <CategoryBadge category={cleanCategory} />}
                {isClaimed && <ClaimedBadge />}
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {instagramProfile && (
                  <a href={instagramProfile.profile_url ?? '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', backgroundColor: '#F3F4F6', color: '#FF4D94', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                    <InstagramIcon size={14} />
                    @{instagramProfile.handle}
                  </a>
                )}
                {tiktokProfile && (
                  <a href={tiktokProfile.profile_url ?? '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', backgroundColor: '#F0F0F0', color: '#010101', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                    <TikTokIcon size={14} />
                    @{tiktokProfile.handle}
                  </a>
                )}
                {website && (
                  <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', color: '#6B7280', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                    <ExternalLink size={13} />
                    {website.replace(/^https?:\/\//, '').split('/')[0]}
                  </a>
                )}
                {/* Intelligence badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <LocationBadge city={city} country={country} />
                <LanguageBadge languageCode={primaryLanguage} />
                {isClaimed && claimedProfile?.availability_status && (
                  <PublicAvailabilityBadge status={claimedProfile.availability_status} />
                )}
              </div>

              </div>
            <div style={{ marginBottom: '12px' }}>
             <SaveToShortlist creatorId={creator.creator_id} />
            </div>
            
            {!isLoggedIn && (
                <div style={{ marginBottom: '12px' }}>
                  <Link
                    href={`/auth/signup?handle=${instagramProfile?.handle ?? tiktokProfile?.handle ?? ''}&role=creator`}
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '8px 16px', 
                      borderRadius: '8px', 
                      backgroundColor: '#FFF0F5', 
                      border: '1px solid #FFB3D1', 
                      color: '#FF4D94', 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      textDecoration: 'none' 
                    }}
                  >
                    ✦ Is this you? Claim this profile
                  </Link>
                </div>
              )}   

          {description && (
                <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: 0, maxWidth: '640px' }}>{description}</p>
              )}
            </div>
            {primaryProfile?.platform_data?.last_updated_at && (
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0, flexShrink: 0 }}>Updated {formatDate(primaryProfile.platform_data.last_updated_at)}</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {instagramProfile && <PlatformMetrics profile={instagramProfile} />}
          {tiktokProfile && <PlatformMetrics profile={tiktokProfile} />}
        </div>

        {instagramProfile && tiktokProfile && (
          <div className="card" style={{ padding: '20px 24px', marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px 0' }}>Total Cross-Platform Followers</p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: '#FFD700', margin: 0, letterSpacing: '-0.02em' }}>{formatCount(creator.total_followers)}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: similarCreators.length > 0 ? '1fr 300px' : '1fr', gap: '24px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* AI Summary — most impactful addition, shown above Content Analytics */}
         
          
          {isClaimed && claimedProfile && isLoggedIn && (
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#3A3A3A', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px 0' }}>Rates</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {claimedProfile.rate_post && <div style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#F3F4F6' }}><p style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px 0' }}>Post</p><p style={{ fontSize: '16px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>${Number(claimedProfile.rate_post).toLocaleString()}</p></div>}
                {claimedProfile.rate_reel && <div style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#F3F4F6' }}><p style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px 0' }}>Reel</p><p style={{ fontSize: '16px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>${Number(claimedProfile.rate_reel).toLocaleString()}</p></div>}
                {claimedProfile.rate_story && <div style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#F3F4F6' }}><p style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px 0' }}>Story</p><p style={{ fontSize: '16px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>${Number(claimedProfile.rate_story).toLocaleString()}</p></div>}
                {claimedProfile.rate_package && <div style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#F3F4F6' }}><p style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px 0' }}>Package</p><p style={{ fontSize: '16px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>${Number(claimedProfile.rate_package).toLocaleString()}</p></div>}
              </div>
              {claimedProfile.rate_notes && <p style={{ fontSize: '13px', color: '#6B7280', margin: '10px 0 0 0', fontStyle: 'italic' }}>"{claimedProfile.rate_notes}"</p>}
            </div>
          )}
          {isClaimed && claimedProfile && !isLoggedIn && (
            <div className="card" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#EBF7FF' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#3AAFF4', margin: '0 0 4px 0' }}>Rates available</p>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                <a href="/auth/login" style={{ color: '#3AAFF4', fontWeight: 600 }}>Log in</a> as a brand to view rates
              </p>
            </div>
          )}

          {hasEnrichment && (
          <ContentAnalytics enrichment={primaryEnrichment!} enrichedAt={enrichedAt} />
            )}
            
            <div className="card" style={{ padding: '28px', backgroundColor: 'white', border: '1px solid #E5E7EB' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#6B7280', margin: '0 0 8px 0' }}>Interested in working with {creator.name.split(' ')[0]}?</h2>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px 0', lineHeight: '1.6' }}>Reach out to discuss a potential partnership and get access to full analytics.</p>
              <GetInTouchButton creatorId={creator.creator_id} creatorName={creator.name} />
            </div>
          </div>

          {similarCreators.length > 0 && (
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#3A3A3A', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Similar Creators</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {similarCreators.map((c) => <SimilarCreatorCard key={c.creator_id} creator={c} />)}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, Instagram, ArrowLeft } from 'lucide-react';
import { CategoryBadge } from '@/components/CategoryBadge';
import { EngagementIndicator } from '@/components/EngagementIndicator';
import { formatCount, formatFollowerRatio, formatDate, cleanDiscoveryTags } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import type { Creator } from '@/lib/types';

async function getCreator(handle: string): Promise<Creator | null> {
  const { data, error } = await supabase
    .from('creators')
    .select('*')
    .eq('instagram_handle', handle)
    .single();
  if (error || !data) return null;
  return data as Creator;
}

async function getSimilarCreators(creator: Creator): Promise<Creator[]> {
  if (!creator.category_name) return [];
  const { data } = await supabase
    .from('creators')
    .select('*')
    .eq('category_name', creator.category_name)
    .neq('instagram_handle', creator.instagram_handle)
    .limit(6);
  return (data ?? []) as Creator[];
}

function AvatarFallback({ name, handle }: { name: string | null; handle: string }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : handle.slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: '96px', height: '96px', borderRadius: '50%',
      backgroundColor: '#EDE9FE', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: '28px', fontWeight: 700, color: '#7C3AED' }}>{initials}</span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '20px 24px', textAlign: 'center', flex: '1 1 140px' }}>
      <p style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px 0' }}>
        {label}
      </p>
      <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827' }}>
        {value}
      </div>
    </div>
  );
}

function SimilarCreatorCard({ creator }: { creator: Creator }) {
  return (
    <Link href={`/creators/${creator.instagram_handle}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          backgroundColor: '#EDE9FE', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#7C3AED' }}>
            {(creator.full_name ?? creator.instagram_handle).slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            @{creator.instagram_handle}
          </p>
          <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
            {formatCount(creator.follower_count)} followers
          </p>
        </div>
        <EngagementIndicator rate={creator.engagement_rate} showLabel={false} size="sm" />
      </div>
    </Link>
  );
}

export default async function CreatorProfilePage({
    params,
  }: {
    params: Promise<{ handle: string }>;
  }) {
    const { handle } = await params;
    const creator = await getCreator(handle);
  
    if (!creator) notFound();
  
    const similarCreators = await getSimilarCreators(creator);
    const discoveryTags = cleanDiscoveryTags(creator.discovered_via_hashtags);
  
    const {
      instagram_handle, full_name, bio, follower_count,
      following_count, posts_count, engagement_rate,
      is_verified, category_name, profile_pic_url,
      website, profile_url, last_updated_at,
    } = creator;
  
    return (
        <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
          <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: '32px', paddingBottom: '80px' }}>
            <Link href="/creators" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 500, marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6B7280' }}>
              <ArrowLeft size={16} />
              Back to Creators
            </Link>
    
            <div className="card" style={{ padding: '32px', marginBottom: '24px', marginTop: '16px' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {profile_pic_url ? (
                  <div style={{ width: '96px', height: '96px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                    <Image src={profile_pic_url} alt={instagram_handle} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                ) : (
                  <AvatarFallback name={full_name} handle={instagram_handle} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                      @{instagram_handle}
                    </h1>
                    {is_verified && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <CategoryBadge category={category_name} />
                  </div>
                  {full_name && (
                    <p style={{ fontSize: '16px', color: '#6B7280', margin: '0 0 12px 0' }}>{full_name}</p>
                  )}
                  {bio && (
                    <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px 0', maxWidth: '640px' }}>{bio}</p>
                  )}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {profile_url && (
                      <a href={profile_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', backgroundColor: '#7C3AED', color: 'white', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                        <Instagram size={14} />
                        View on Instagram
                      </a>
                    )}
                    {website && (
                      <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #E5E7EB', color: '#6B7280', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                        <ExternalLink size={14} />
                        {website.replace(/^https?:\/\//, '').split('/')[0]}
                      </a>
                    )}
                  </div>
                </div>
                {last_updated_at && (
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>Updated {formatDate(last_updated_at)}</p>
                )}
              </div>
            </div>
    
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <MetricCard label="Followers" value={formatCount(follower_count)} />
              <MetricCard label="Following" value={formatCount(following_count)} />
              <MetricCard label="Posts" value={formatCount(posts_count)} />
              <MetricCard label="Engagement Rate" value={<EngagementIndicator rate={engagement_rate} showLabel={false} size="lg" />} />
              <MetricCard label="Follower Ratio" value={formatFollowerRatio(follower_count, following_count)} />
            </div>
    
            <div style={{ display: 'grid', gridTemplateColumns: similarCreators.length > 0 ? '1fr 320px' : '1fr', gap: '24px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {discoveryTags.length > 0 && (
                  <div className="card" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Discovered Via</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {discoveryTags.map((tag) => (
                        <span key={tag} className="badge bg-subtle text-secondary" style={{ fontSize: '13px', padding: '4px 12px' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="card" style={{ padding: '28px', background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)', border: '1px solid #DDD6FE' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
                    Interested in working with {full_name?.split(' ')[0] ?? instagram_handle}?
                  </h2>
                  <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px 0', lineHeight: '1.6' }}>
                    Reach out to discuss a potential partnership and get access to full analytics.
                  </p>
                  <a href={`mailto:hello@influenceai.com?subject=Partnership Inquiry: @${instagram_handle}&body=Hi, I'm interested in working with @${instagram_handle}.`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', backgroundColor: '#7C3AED', color: 'white', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
                    Get in Touch
                  </a>
                </div>
              </div>
    
              {similarCreators.length > 0 && (
                <div className="card" style={{ padding: '24px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Similar Creators</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {similarCreators.map((c) => (
                      <SimilarCreatorCard key={c.id} creator={c} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
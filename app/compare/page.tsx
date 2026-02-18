'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { EngagementIndicator } from '@/components/EngagementIndicator';
import { CategoryBadge } from '@/components/CategoryBadge';
import { formatCount, formatFollowerRatio } from '@/lib/formatters';
import type { Creator } from '@/lib/types';
import { getLanguageName } from '@/lib/language-utils';

function AvatarFallback({ name }: { name: string }) {
  const initials = (name ?? '??').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
      <span style={{ fontSize: '16px', fontWeight: 700, color: '#7C3AED' }}>{initials}</span>
    </div>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const handlesParam = searchParams.get('handles') ?? '';
  const handles = handlesParam.split(',').map((h) => h.trim()).filter(Boolean);

  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (handles.length < 2) {
      setLoading(false);
      return;
    }
    fetch(`/api/creators/compare?handles=${handles.join(',')}`)
      .then((r) => r.json())
      .then((d) => {
        setCreators(d.creators ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load creators.');
        setLoading(false);
      });
  }, [handlesParam]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px' }}>
        <p className="text-secondary">Loading comparison...</p>
      </div>
    );
  }

  if (handles.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '80px' }}>
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>No creators selected</p>
        <p className="text-secondary" style={{ marginBottom: '24px' }}>Select 2-4 creators from the discovery page to compare them.</p>
        <Link href="/creators" style={{ display: 'inline-flex', padding: '10px 20px', borderRadius: '8px', backgroundColor: '#7C3AED', color: 'white', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
          Browse Creators
        </Link>
      </div>
    );
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '80px' }}><p className="text-red">{error}</p></div>;
  }

  // Find best values for highlighting
  const maxFollowers = Math.max(...creators.map((c) => c.total_followers ?? 0));
  const maxEngagement = Math.max(...creators.map((c) => c.instagram_engagement ?? c.tiktok_engagement ?? 0));
  const maxPosts = Math.max(...creators.map((c) => 0));
  const maxRatio = Math.max(...creators.map((c) => 0));

  const colWidth = `${Math.floor(100 / creators.length)}%`;

  const rowLabel = (label: string) => (
    <div style={{ padding: '14px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
      <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
    </div>
  );

  const cell = (key: string, content: React.ReactNode, highlight = false) => (
    <td key={key} style={{ width: colWidth, padding: '14px 16px', borderBottom: '1px solid #F3F4F6', backgroundColor: highlight ? '#F5F3FF' : 'white', textAlign: 'center', verticalAlign: 'middle' }}>
      {content}
    </td>
  );

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: '32px', paddingBottom: '80px' }}>

        <Link href="/creators" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 500, marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6B7280' }}>
          <ArrowLeft size={16} />
          Back to Creators
        </Link>

        <div style={{ marginBottom: '32px', marginTop: '16px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Compare Creators
          </h1>
          <p className="text-secondary" style={{ fontSize: '15px', margin: 0 }}>
            Side-by-side comparison of {creators.length} creators
          </p>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: '140px', padding: '20px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Metric</span>
                </th>
                {creators.map((creator) => (
  <th key={creator.creator_id} style={{ width: colWidth, padding: '20px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'center' }}>
                    <AvatarFallback name={creator.name} />
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: '10px 0 2px 0' }}>{creator.name}</p>
                    {creator.instagram_handle && <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 8px 0' }}>@{creator.instagram_handle}</p>}
                    {/* category removed - now in platform_data */}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Followers */}
              {/* Total Followers */}
<tr>
  <td style={{ padding: '14px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
    <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Total Followers</p>
  </td>
  {creators.map((c) => cell(c.creator_id,
    <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{formatCount(c.total_followers)}</span>,
    c.total_followers === maxFollowers
  ))}
</tr>

{/* Instagram Followers */}
<tr>
  <td style={{ padding: '14px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
    <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Instagram Followers</p>
  </td>
  {creators.map((c) => cell(c.creator_id,
    <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{c.instagram_followers ? formatCount(c.instagram_followers) : '—'}</span>,
    false
  ))}
</tr>

{/* Instagram Engagement */}
<tr>
  <td style={{ padding: '14px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
    <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Instagram Engagement</p>
  </td>
  {creators.map((c) => cell(c.creator_id,
    c.instagram_engagement ? <EngagementIndicator rate={c.instagram_engagement} showLabel={false} size="md" /> : <span style={{ color: '#9CA3AF' }}>—</span>,
    Number(c.instagram_engagement) === maxEngagement
  ))}
</tr>

{/* TikTok Followers */}
<tr>
  <td style={{ padding: '14px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
    <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>TikTok Followers</p>
  </td>
  {creators.map((c) => cell(c.creator_id,
    <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{c.tiktok_followers ? formatCount(c.tiktok_followers) : '—'}</span>,
    false
  ))}
</tr>

{/* TikTok Engagement */}
<tr>
  <td style={{ padding: '14px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
    <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>TikTok Engagement</p>
  </td>
  {creators.map((c) => cell(c.creator_id,
    c.tiktok_engagement ? <EngagementIndicator rate={c.tiktok_engagement} showLabel={false} size="md" /> : <span style={{ color: '#9CA3AF' }}>—</span>,
    Number(c.tiktok_engagement) === maxEngagement
  ))}
</tr>

{/* Verified */}
<tr>
  <td style={{ padding: '14px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
    <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Verified</p>
  </td>
  {creators.map((c) => cell(c.creator_id,
    <span style={{ fontSize: '14px', fontWeight: 600, color: (c.instagram_verified || c.tiktok_verified) ? '#059669' : '#9CA3AF' }}>
      {(c.instagram_verified || c.tiktok_verified) ? 'Yes' : 'No'}
    </span>,
    false
  ))}
</tr>

{/* Language */}
<tr>
  <td style={{ padding: '14px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
    <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>🌐 Language</p>
  </td>
  {creators.map((c) => cell(c.creator_id,
    <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
      {getLanguageName(c.primary_language) ?? <span style={{ color: '#9CA3AF' }}>—</span>}
    </span>,
    false
  ))}
</tr>

{/* Location */}
<tr>
  <td style={{ padding: '14px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
    <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>📍 Location</p>
  </td>
  {creators.map((c) => {
    const loc = [c.city, c.country].filter(Boolean).join(', ');
    return cell(c.creator_id,
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
        {loc || <span style={{ color: '#9CA3AF' }}>—</span>}
      </span>,
      false
    );
  })}
</tr>

{/* Business Email */}
<tr>
  <td style={{ padding: '14px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
    <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>📧 Business Email</p>
  </td>
  {creators.map((c) => cell(c.creator_id,
    c.contact_email ? (
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#059669' }}>✓</span>
    ) : (
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#D1D5DB' }}>✗</span>
    ),
    false
  ))}
</tr>

{/* View Profile */}
<tr>
  <td style={{ padding: '14px 16px', backgroundColor: '#F9FAFB' }}>
    <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Profile</p>
  </td>
  {creators.map((c) => {
    const handle = c.instagram_handle ?? c.tiktok_handle ?? '';
    return (
      <td key={c.creator_id} style={{ width: colWidth, padding: '14px 16px', backgroundColor: 'white', textAlign: 'center' }}>
        <Link href={`/creators/${handle}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', backgroundColor: '#7C3AED', color: 'white', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
          <ExternalLink size={13} />
          View Profile
        </Link>
      </td>
    );
  })}
</tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px', textAlign: 'center' }}><p className="text-secondary">Loading...</p></div>}>
      <CompareContent />
    </Suspense>
  );
}
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle } from 'lucide-react';
import { formatCount, truncate } from '@/lib/formatters';
import { CategoryBadge } from './CategoryBadge';
import { EngagementIndicator } from './EngagementIndicator';
import type { Creator } from '@/lib/types';

interface CreatorCardProps {
  creator: Creator;
  onCompareToggle?: (handle: string) => void;
  isSelectedForCompare?: boolean;
}

function AvatarFallback({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#7C3AED' }}>{initials}</span>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.05a8.16 8.16 0 004.77 1.52V7.12a4.85 4.85 0 01-1-.43z"/>
    </svg>
  );
}

export function CreatorCard({ creator, onCompareToggle, isSelectedForCompare }: CreatorCardProps) {
  const {
    name,
    instagram_handle,
    instagram_followers,
    instagram_engagement,
    instagram_verified,
    instagram_pic,
    tiktok_handle,
    tiktok_followers,
    tiktok_engagement,
    total_followers,
    primary_platform,
  } = creator;

  const primaryHandle = primary_platform === 'tiktok' ? tiktok_handle : (instagram_handle ?? tiktok_handle);
  const profilePic = primary_platform === 'tiktok' ? creator.tiktok_pic : (instagram_pic ?? creator.tiktok_pic);
  const primaryEngagement = primary_platform === 'tiktok' ? tiktok_engagement : (instagram_engagement ?? tiktok_engagement);
  const isVerified = primary_platform === 'tiktok' ? creator.tiktok_verified : (instagram_verified ?? creator.tiktok_verified);
  const compareHandle = primaryHandle ?? '';

  // Get category from platform_data via the handle we have
  const hasTikTok = !!tiktok_handle;
  const hasInstagram = !!instagram_handle;
  const hasBoth = hasInstagram && hasTikTok;

  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', outline: isSelectedForCompare ? '2px solid #7C3AED' : 'none' }}>

      {/* Compare checkbox */}
      {onCompareToggle && compareHandle && (
        <button onClick={() => onCompareToggle(compareHandle)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', borderRadius: '4px', color: isSelectedForCompare ? '#7C3AED' : '#D1D5DB' }}>
          <CheckCircle size={18} strokeWidth={2} />
        </button>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
          <AvatarFallback name={name} />
        

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </span>
            {isVerified && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>

          {/* Platform handles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {instagram_handle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#E1306C' }}>
                <InstagramIcon />
                <span style={{ fontSize: '12px', color: '#6B7280' }}>@{instagram_handle}</span>
              </div>
            )}
            {tiktok_handle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#010101' }}>
                <TikTokIcon />
                <span style={{ fontSize: '12px', color: '#6B7280' }}>@{tiktok_handle}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform follower counts */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {instagram_handle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#FFF0F5', borderRadius: '6px', padding: '4px 8px' }}>
            <span style={{ color: '#E1306C' }}><InstagramIcon /></span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{formatCount(instagram_followers)}</span>
          </div>
        )}
        {tiktok_handle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F0F0F0', borderRadius: '6px', padding: '4px 8px' }}>
            <span style={{ color: '#010101' }}><TikTokIcon /></span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{formatCount(tiktok_followers)}</span>
          </div>
        )}
        {hasBoth && (
          <div style={{ borderRadius: '6px', padding: '4px 8px', backgroundColor: '#EDE9FE' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#7C3AED' }}>{formatCount(total_followers)} total</span>
          </div>
        )}
      </div>

      {/* Engagement + category */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <EngagementIndicator rate={primaryEngagement} showLabel={false} size="sm" />
      </div>

      {/* View profile */}
      {primaryHandle && (
        <Link href={`/creators/${primaryHandle}`} style={{ display: 'block', textAlign: 'center', padding: '8px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', fontWeight: 500, color: '#6B7280', textDecoration: 'none', marginTop: 'auto' }} className="hover:bg-subtle hover:text-primary hover:border-purple">
          View Profile
        </Link>
      )}
    </div>
  );
}
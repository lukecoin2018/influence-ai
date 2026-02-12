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

function AvatarFallback({ name, handle }: { name: string | null; handle: string }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : handle.slice(0, 2).toUpperCase();

  return (
    <div style={{
      width: '48px', height: '48px', borderRadius: '50%',
      backgroundColor: '#EDE9FE', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#7C3AED' }}>{initials}</span>
    </div>
  );
}

export function CreatorCard({ creator, onCompareToggle, isSelectedForCompare }: CreatorCardProps) {
  const {
    instagram_handle, full_name, bio, follower_count,
    engagement_rate, category_name, profile_pic_url, is_verified,
  } = creator;

  return (
    <div
      className="card"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'relative',
        outline: isSelectedForCompare ? '2px solid #7C3AED' : 'none',
      }}
    >
      {/* Compare checkbox */}
      {onCompareToggle && (
        <button
          onClick={() => onCompareToggle(instagram_handle)}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '2px', borderRadius: '4px',
            color: isSelectedForCompare ? '#7C3AED' : '#D1D5DB',
          }}
          title={isSelectedForCompare ? 'Remove from compare' : 'Add to compare'}
        >
          <CheckCircle size={18} strokeWidth={2} />
        </button>
      )}

      {/* Header: avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {profile_pic_url ? (
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
            <Image
              src={profile_pic_url}
              alt={instagram_handle}
              fill
              style={{ objectFit: 'cover' }}
              unoptimized
            />
          </div>
        ) : (
          <AvatarFallback name={full_name} handle={instagram_handle} />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              fontWeight: 600, fontSize: '14px', color: '#111827',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              @{instagram_handle}
            </span>
            {is_verified && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#7C3AED" style={{ flexShrink: 0 }}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#7C3AED" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          {full_name && (
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {full_name}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {bio && (
        <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {truncate(bio, 100)}
        </p>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span className="badge bg-subtle text-secondary" style={{ fontSize: '12px', padding: '3px 8px', fontWeight: 600 }}>
          {formatCount(follower_count)} followers
        </span>
        <EngagementIndicator rate={engagement_rate} showLabel={false} size="sm" />
        <CategoryBadge category={category_name} size="sm" />
      </div>

      {/* View profile link */}
      <Link
        href={`/creators/${instagram_handle}`}
        style={{
          display: 'block', textAlign: 'center',
          padding: '8px', borderRadius: '8px',
          border: '1px solid #E5E7EB',
          fontSize: '13px', fontWeight: 500,
          color: '#6B7280', textDecoration: 'none',
          marginTop: 'auto',
          transition: 'all 0.15s ease',
        }}
        className="hover:bg-subtle hover:text-primary hover:border-purple"
      >
        View Profile
      </Link>
    </div>
  );
}
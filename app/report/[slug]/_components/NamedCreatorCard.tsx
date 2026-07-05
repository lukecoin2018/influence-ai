import Link from 'next/link';
import { formatCount, formatEngagementRate } from '@/lib/formatters';
import { initialsFrom } from '@/app/_data';

export type NamedCreator = {
  handle: string;
  displayName: string;
  platform: 'instagram' | 'tiktok';
  followerCount: number | null;
  engagementRate: number | null;
};

/** Dark-theme named creator card shared by Tier 1, Tier 2, and Tier 3's top-5. Optionally links (Tier 3 top-5 only). */
export function NamedCreatorCard({ creator, href }: { creator: NamedCreator; href?: string }) {
  const body = (
    <div
      style={{
        background: '#141414',
        border: '1px solid #262626',
        borderRadius: '16px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '42px', height: '42px', borderRadius: '11px', background: '#FFD700',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '15px', color: '#111', flexShrink: 0,
          }}
        >
          {initialsFrom(creator.displayName, creator.handle)}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '14.5px', color: '#F2F0EA', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {creator.displayName}
          </p>
          <p style={{ fontSize: '12px', color: '#9B9890', margin: '2px 0 0', textTransform: 'capitalize' }}>
            @{creator.handle} · {creator.platform}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, background: '#0A0A0A', borderRadius: '10px', padding: '10px 12px' }}>
          <p style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6E6A5C', margin: '0 0 3px' }}>Followers</p>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#F2F0EA', margin: 0 }}>{formatCount(creator.followerCount)}</p>
        </div>
        <div style={{ flex: 1, background: '#0A0A0A', borderRadius: '10px', padding: '10px 12px' }}>
          <p style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6E6A5C', margin: '0 0 3px' }}>Engagement</p>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#FFD700', margin: 0 }}>{formatEngagementRate(creator.engagementRate)}</p>
        </div>
      </div>
    </div>
  );

  if (!href) return body;
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      {body}
    </Link>
  );
}

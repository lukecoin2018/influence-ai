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

type Theme = 'dark' | 'light';

// Mirrors home.css's --card/--paper/--ink/--muted-l (light) and the page's own
// dark tokens (dark) — the two section backgrounds this card ever sits on.
const PALETTES: Record<Theme, { card: string; border: string; statBg: string; title: string; meta: string; label: string; statValue: string; engagementValue: string }> = {
  dark: {
    card: '#141414',
    border: '#262626',
    statBg: '#0A0A0A',
    title: '#F2F0EA',
    meta: '#9B9890',
    label: '#6E6A5C',
    statValue: '#F2F0EA',
    engagementValue: '#FFD700',
  },
  light: {
    card: '#FFFFFF',
    border: '#E4E0D4',
    statBg: '#F7F5F0',
    title: '#111111',
    meta: '#6E6A5C',
    label: '#6E6A5C',
    statValue: '#111111',
    engagementValue: '#111111',
  },
};

/** Named creator card shared by Tier 1, Tier 2, and Tier 3's top matches. Optionally links (Tier 3 top matches only). */
export function NamedCreatorCard({ creator, href, theme = 'dark' }: { creator: NamedCreator; href?: string; theme?: Theme }) {
  const p = PALETTES[theme];

  const body = (
    <div
      style={{
        background: p.card,
        border: `1px solid ${p.border}`,
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
          <p style={{ fontWeight: 700, fontSize: '14.5px', color: p.title, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {creator.displayName}
          </p>
          <p style={{ fontSize: '12px', color: p.meta, margin: '2px 0 0', textTransform: 'capitalize' }}>
            @{creator.handle} · {creator.platform}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, background: p.statBg, borderRadius: '10px', padding: '10px 12px' }}>
          <p style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: p.label, margin: '0 0 3px' }}>Followers</p>
          <p style={{ fontSize: '15px', fontWeight: 700, color: p.statValue, margin: 0 }}>{formatCount(creator.followerCount)}</p>
        </div>
        <div style={{ flex: 1, background: p.statBg, borderRadius: '10px', padding: '10px 12px' }}>
          <p style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: p.label, margin: '0 0 3px' }}>Engagement</p>
          <p style={{ fontSize: '15px', fontWeight: 700, color: p.engagementValue, margin: 0 }}>{formatEngagementRate(creator.engagementRate)}</p>
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

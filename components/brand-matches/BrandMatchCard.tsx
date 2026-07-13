import Link from 'next/link';
import { MapPin, type LucideIcon } from 'lucide-react';
import { formatCount } from '@/lib/formatters';
import type { MatchedBrand } from '@/lib/reports/creator-brand-matches';
import { consolidateCategory } from '@/lib/reports/category-consolidation';
import { badgeFor, bracketMarkerPercent, initialOf, recencyLineFull, type BadgeKind } from '@/app/claim/[handle]/_data';

// Canonical LMG brand accents (app/globals.css's @theme) — see the same
// constant comment in app/claim/[handle]/page.tsx, which this file was
// extracted from (that page now imports Badge/BrandMatchCard from here
// instead of defining them locally — same visuals, one source of truth).
const YELLOW = 'var(--color-lmg-yellow)'; // #FFD700
const BLUE = 'var(--color-lmg-blue)'; // #3AAFF4
const GREY = 'var(--color-lmg-grey)'; // #3A3A3A

export function Badge({ kind }: { kind: BadgeKind }) {
  if (kind === 'repeat-hirer') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: YELLOW, color: GREY, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREY, display: 'inline-block' }} />
        Repeat hirer
      </span>
    );
  }
  if (kind === 'program') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, border: '1px solid #CFCDC4', color: '#4A4946', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
        Program
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, border: '1px solid #CFCDC4', color: '#6D6B65', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      Sighting
    </span>
  );
}

export function RecencyRow({ bucket, mostRecentPost }: { bucket: MatchedBrand['recencyBucket']; mostRecentPost: string | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: GREY }}>
      {bucket !== 'neutral' && (
        <span
          style={{
            width: 7, height: 7, borderRadius: '50%', background: YELLOW, flexShrink: 0,
            animation: bucket === 'active' ? 'pulseDot 2.4s ease-in-out infinite' : undefined,
          }}
        />
      )}
      <span>{recencyLineFull(bucket, mostRecentPost)}</span>
    </div>
  );
}

export interface BrandMatchCardAction {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface BrandMatchCardProps {
  match: MatchedBrand;
  creatorFollowers: number | null;
  /**
   * Omitted/empty = no footer at all (the dashboard's v1 standalone-discovery
   * cards — tool handoffs are a deferred decision). The teaser passes its two
   * signup CTAs here unchanged.
   */
  actions?: BrandMatchCardAction[];
}

/**
 * The "full/unlocked" brand card — extracted from app/claim/[handle]/page.tsx
 * (formerly a private HeroCard there, hardcoded to signup links) so the
 * creator dashboard can render the exact same card with different (or no)
 * action buttons, instead of forking the markup.
 */
export function BrandMatchCard({ match, creatorFollowers, actions }: BrandMatchCardProps) {
  const badge = badgeFor(match.isProgram, match.isRepeatHirer);
  const markerPct = creatorFollowers != null ? bracketMarkerPercent(creatorFollowers, match.p25Followers, match.p75Followers) : null;

  return (
    <article
      style={{
        background: '#FFFFFF', border: '1px solid #E8E6DF', borderRadius: 16,
        boxShadow: '0 8px 24px rgba(20,18,12,0.08), 0 2px 6px rgba(20,18,12,0.04)',
        padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 16,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: 12, background: YELLOW, border: '1px solid rgba(255,215,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: GREY, flexShrink: 0,
          }}
        >
          {initialOf(match.canonicalName)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em', color: GREY, overflowWrap: 'anywhere' }}>{match.canonicalName}</div>
          <div style={{ fontSize: 13, color: '#6D6B65' }}>{consolidateCategory(match.category)}</div>
        </div>
        <Badge kind={badge} />
      </header>

      {markerPct != null && (
        <div style={{ background: '#FAFAF8', border: '1px solid #E8E6DF', borderRadius: 12, padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: GREY }}>Hires creators your size</span>
            <span style={{ fontSize: 12, color: '#6D6B65' }}>
              {match.p25Followers === match.p75Followers
                ? `around ${formatCount(match.p25Followers)} followers`
                : `${formatCount(match.p25Followers)} – ${formatCount(match.p75Followers)} followers`}
            </span>
          </div>
          <div style={{ position: 'relative', height: 26 }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 15, height: 8, borderRadius: 999, background: YELLOW }} />
            <div style={{ position: 'absolute', top: 11, left: `${markerPct}%`, transform: 'translateX(-50%)' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: GREY, border: '3px solid #fff', boxShadow: '0 2px 6px rgba(20,18,12,0.06)' }} />
            </div>
            <div
              style={{
                position: 'absolute', top: -6, left: `${markerPct}%`, transform: 'translateX(-50%)', fontSize: 11, fontWeight: 700,
                color: GREY, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #E8E6DF', borderRadius: 999,
                padding: '1px 8px', boxShadow: '0 1px 2px rgba(20,18,12,0.04)',
              }}
            >
              You · {formatCount(creatorFollowers)}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', color: GREY, lineHeight: 1 }}>{match.distinctCreators}</span>
          <span style={{ fontSize: 13, color: '#6D6B65', lineHeight: 1.3 }}>
            creator{match.distinctCreators === 1 ? '' : 's'} detected
            <br />
            hiring your size
          </span>
        </div>
        <RecencyRow bucket={match.recencyBucket} mostRecentPost={match.mostRecentPost} />
      </div>

      {match.regionMatch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: BLUE, color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>
          <MapPin size={14} aria-hidden="true" />
          Hiring in your region — {match.regionMatch.label}
        </div>
      )}

      {actions && actions.length > 0 && (
        <footer style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #E8E6DF', paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6D6B65' }}>
            Act on it now — both tools are pre-filled with {match.canonicalName}&apos;s context:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {actions.map((action, i) => {
              const Icon = action.icon;
              const primary = i === 0;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  style={{
                    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42,
                    borderRadius: 999, textDecoration: 'none', fontSize: 13, fontWeight: 700,
                    border: primary ? 'none' : '1.5px solid #3A3A3A',
                    background: primary ? GREY : '#fff',
                    color: primary ? '#fff' : GREY,
                  }}
                >
                  <Icon size={13} aria-hidden="true" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </footer>
      )}
    </article>
  );
}

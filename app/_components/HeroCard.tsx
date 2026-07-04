'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatCount } from '@/lib/formatters';
import { indexForTimestamp } from '../_data';
import type { FeaturedCreator, ContentMixColor } from '../_data';

const MIX_COLORS: Record<ContentMixColor, string> = {
  yellow: 'var(--yellow)',
  ink: 'var(--ink)',
  gray: '#C9C4B4',
};

const ROTATE_MS = 10_000;
const HALF_FADE_MS = 150; // fade-out + fade-in = ~300ms total crossfade

/**
 * `now` is captured once server-side (see page.tsx) and passed down as a prop
 * so the initial pick — pool[indexForTimestamp(now, pool.length)] — renders
 * identically on the server and during client hydration. No Date.now() or
 * Math.random() runs during render; the timer below only starts post-mount.
 */
export function HeroCard({ pool, now }: { pool: FeaturedCreator[]; now: number }) {
  const [index, setIndex] = useState(() => indexForTimestamp(now, pool.length));
  const [fading, setFading] = useState(false);
  const pausedRef = useRef(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    const handleChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (pool.length <= 1) return;
    const timer = setInterval(() => {
      if (pausedRef.current || reducedMotionRef.current) return;
      setFading(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % pool.length);
        setFading(false);
      }, HALF_FADE_MS);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [pool.length]);

  const featured = pool[index];
  const hasStatsRow = featured.followers != null || featured.postsPerWeek != null || featured.avgViews != null;
  const hasContentMix = featured.contentMix != null && featured.contentMix.length > 0;
  const hasBrands = featured.brands != null && featured.brands.length > 0;
  const visibleBrands = featured.brands?.slice(0, 4) ?? [];
  const moreBrandsCount = featured.brands ? featured.brands.length - visibleBrands.length : 0;
  const isAboveMedian =
    featured.engagementRate != null && featured.platformMedianEngagement != null
      ? featured.engagementRate >= featured.platformMedianEngagement
      : null;

  return (
    <div
      className="cardstack"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div className="ghost" aria-hidden="true"></div>
      <div className={`pcard${fading ? ' fading' : ''}`} role="figure" aria-label="Featured creator profile">
        <div className="pcard-head">
          <span className="pcard-live">Live from the database</span>
          <span className="pill">Active</span>
        </div>
        <div className="pcard-id">
          <div className="pcard-who">
            <div className="avatar">{featured.initials}</div>
            <div>
              <div className="pname">{featured.displayName}</div>
              <div className="phandle">
                @{featured.handle} · {featured.platform === 'instagram' ? 'Instagram' : 'TikTok'}
                {featured.location ? ` · ${featured.location}` : ''}
              </div>
            </div>
          </div>
          {featured.engagementRate != null && (
            <div className="er-big">
              <b>{featured.engagementRate.toFixed(1)}%</b><span>engagement</span>
              {featured.platformMedianEngagement != null && (
                <span className="er-vs" style={{ color: isAboveMedian ? 'var(--up)' : 'var(--down)' }}>
                  {isAboveMedian ? '▲' : '▼'} vs {featured.platformMedianEngagement.toFixed(1)}% platform median
                </span>
              )}
            </div>
          )}
        </div>

        {hasStatsRow && (
          <div className="pstats">
            {featured.followers != null && (
              <div className="pstat"><b>{formatCount(featured.followers)}</b><span>followers</span></div>
            )}
            {featured.postsPerWeek != null && (
              <div className="pstat"><b>{featured.postsPerWeek.toFixed(1)}<small>/wk</small></b><span>posts</span></div>
            )}
            {featured.avgViews != null && (
              <div className="pstat"><b>{formatCount(featured.avgViews)}</b><span>avg views</span></div>
            )}
          </div>
        )}

        {hasContentMix && (
          <>
            <div className="plabel">Content mix</div>
            <div className="mixbar">
              {featured.contentMix!.map((slice) => (
                <div key={slice.label} style={{ width: `${slice.pct}%`, background: MIX_COLORS[slice.color] }} />
              ))}
            </div>
            <div className="mixkey">
              {featured.contentMix!.map((slice) => (
                <span key={slice.label}>
                  <i style={{ background: MIX_COLORS[slice.color] }}></i>{slice.label} {slice.pct}%
                </span>
              ))}
            </div>
          </>
        )}

        {hasBrands && (
          <>
            <div className="plabel">Brand partnerships detected · {featured.brandPartnershipsDetected}</div>
            <div className="brands">
              {visibleBrands.map((brand) => (
                <span className="brand" key={brand}>{brand}</span>
              ))}
              {moreBrandsCount > 0 && <span className="brand more">+{moreBrandsCount} more</span>}
            </div>
          </>
        )}

        <div className="pcard-foot">
          <span className="when">Data calculated {featured.dataAsOf}</span>
          <Link className="openp" href={`/creators/${featured.handle}`}>Open full profile →</Link>
        </div>
      </div>
    </div>
  );
}

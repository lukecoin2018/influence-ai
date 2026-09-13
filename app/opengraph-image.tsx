import { ImageResponse } from 'next/og';
import { getPublicStats } from './_queries';
import { withTimeout } from '@/lib/withTimeout';
import type { PublicStats } from './_data';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The dark-background lockup from the brand kit, read from /public at build
// time and handed to Satori as a data URI. Satori can't fetch relative URLs
// and ships no fonts, and the kit's SVGs are outlined paths, so this is the
// one way the share image draws the real wordmark rather than a system-font
// approximation of it.
const LOCKUP_DATA_URI = `data:image/svg+xml;base64,${readFileSync(
  join(process.cwd(), 'public', 'brand', 'lockup-dark-bg.svg')
).toString('base64')}`;

export const alt = 'InfluenceIT — creator intelligence database';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const STATS_TIMEOUT_MS = 5_000;

// This route is statically prerendered at build time — a slow or failing
// public_stats() RPC (it's hit a statement timeout at least once) must never
// be able to fail `next build`. Last-known-good snapshot, used only on
// timeout/error: this is a social-preview image, not live user-facing data,
// so briefly-stale numbers here are the right trade for "the build always
// succeeds." Update this if it's ever actually shown for a long stretch.
const FALLBACK_STATS: PublicStats = {
  creators: 5112,
  postsAnalyzed: 69451,
  brandDeals: 3798,
  igMedian: 0.6,
  tiktokMedian: 0.4,
  lastIndex: 'Jul 3, 2026',
};

export default async function OpengraphImage() {
  const stats = await withTimeout(getPublicStats(), STATS_TIMEOUT_MS).catch(() => FALLBACK_STATS);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#0A0A0A',
          color: '#F2F0EA',
          fontFamily: 'sans-serif',
        }}
      >
        {/* The brand lockup, inlined as SVG data URIs: this runs in Satori at
            build time, which can't fetch /public and has no fonts, so the
            kit's outlined-path SVGs are the only way to draw the real mark. */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 56 }}>
          <img src={LOCKUP_DATA_URI} width={316} height={56} alt="" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 78, fontWeight: 700, lineHeight: 1.05 }}>
          <span>{stats.creators.toLocaleString()} creators.</span>
          <span style={{ color: '#FFD700' }}>Zero guesswork.</span>
        </div>
        <div style={{ display: 'flex', marginTop: 56, fontSize: 32, color: '#9B9890' }}>
          <span>
            IG {stats.igMedian.toFixed(1)}% · TikTok {stats.tiktokMedian.toFixed(1)}% median engagement
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}

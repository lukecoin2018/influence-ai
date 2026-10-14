import { ImageResponse } from 'next/og';
import { getPublicStats } from './_queries';
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

// Same figures and same rule as the homepage (app/page.tsx): read from the
// snapshot row (migration 0031), no fallback. A failed read throws — at
// runtime the last good image keeps being served, at build time the build
// fails. Before the snapshot, a timeout here baked hardcoded July figures
// (5,112 creators) into the share image until the next deploy; the revalidate
// below also means the image now follows the snapshot instead of being frozen
// at build time.
export const revalidate = 300;

export default async function OpengraphImage() {
  const stats = await getPublicStats();

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

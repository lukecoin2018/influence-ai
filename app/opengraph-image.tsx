import { ImageResponse } from 'next/og';
import { getPublicStats } from './_queries';

export const alt = 'InfluenceIT — creator intelligence database';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 56 }}>
          <div style={{ display: 'flex', width: 56, height: 56, background: '#FFD700', borderRadius: 14 }} />
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 700 }}>
            <span>Influence</span>
            <span style={{ color: '#FFD700' }}>IT</span>
          </div>
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

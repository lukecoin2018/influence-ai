'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatCount } from '@/lib/formatters';
import { initialsFrom } from '../_data';
import type { LeaderboardRow } from '../_data';

type Platform = 'instagram' | 'tiktok';

// Column sorting is intentionally unimplemented — the mockup itself has no click
// handlers, just a static "sorted" indicator. Real sort state comes with a later pass.
// Row order is never recomputed here — the homepage snapshot already stores rows
// sorted correctly per platform (engagement for IG, med_views for TikTok).
//
// An empty platform gets no tab, so the heading can never read "Top 0". The
// snapshot refuses to save an empty board (migration 0031), so this is the
// second line of defence; app/page.tsx drops the whole section when both are
// empty.
export function Leaderboard({
  instagram,
  tiktok,
  totalCreators,
}: {
  instagram: LeaderboardRow[];
  tiktok: LeaderboardRow[];
  totalCreators: number;
}) {
  const [selected, setSelected] = useState<Platform>('instagram');
  const available: Platform[] = [
    ...(instagram.length > 0 ? (['instagram'] as const) : []),
    ...(tiktok.length > 0 ? (['tiktok'] as const) : []),
  ];
  if (available.length === 0) return null;
  const platform: Platform = available.includes(selected) ? selected : available[0];
  const rows = platform === 'instagram' ? instagram : tiktok;
  const maxEngagement = Math.max(1, ...instagram.map((r) => r.engagement));
  const maxViews = Math.max(1, ...tiktok.map((r) => r.medViews));

  return (
    <section className="board" id="board">
      <div className="wrap">
        <div className="board-head">
          <div>
            <div className="eyebrow-l">The leaderboard</div>
            <h2>Top {rows.length} by {platform === 'instagram' ? 'engagement' : 'median views'}, <span className="hl-u">right now.</span></h2>
          </div>
          <div className="board-hint">Ranked live from the index.<br />Click a column to re-sort.</div>
        </div>

        <div className="board-tabs" role="tablist" aria-label="Platform">
          {available.includes('instagram') && (
            <button
              type="button"
              role="tab"
              aria-selected={platform === 'instagram'}
              className={`tab-btn${platform === 'instagram' ? ' active' : ''}`}
              onClick={() => setSelected('instagram')}
            >
              Instagram
            </button>
          )}
          {available.includes('tiktok') && (
            <button
              type="button"
              role="tab"
              aria-selected={platform === 'tiktok'}
              className={`tab-btn${platform === 'tiktok' ? ' active' : ''}`}
              onClick={() => setSelected('tiktok')}
            >
              TikTok
            </button>
          )}
        </div>

        <div className="tablecard">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Creator</th>
                  <th style={{ textAlign: 'right' }}>Followers</th>
                  <th className="sorted" style={{ textAlign: 'right' }}>
                    {platform === 'instagram' ? 'Engagement ↓' : 'Median Views ↓'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.handle}>
                    <td className="rk">{String(i + 1).padStart(2, '0')}</td>
                    <td>
                      <div className="who">
                        <div className={`avatar ${i % 2 ? 'inkv' : ''}`}>{initialsFrom(r.displayName, r.handle)}</div>
                        <div><div className="nm">{r.displayName}</div><div className="hd">@{r.handle}</div></div>
                      </div>
                    </td>
                    <td className="fl">{formatCount(r.followers)}</td>
                    <td>
                      {platform === 'instagram' ? (
                        <div className="er-wrap">
                          <span className="er-track">
                            <span className="er-fill" style={{ display: 'block', width: `${(r.engagement / maxEngagement) * 100}%` }}></span>
                          </span>
                          <span className="er-val">{r.engagement.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <div className="er-wrap">
                          <span className="er-track">
                            <span className="er-fill" style={{ display: 'block', width: `${(r.medViews / maxViews) * 100}%` }}></span>
                          </span>
                          <span className="views-cell">
                            <span className="er-val">{formatCount(r.medViews)}</span>
                            <span className="er-sub">{r.engagement.toFixed(1)}% eng.</span>
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tfoot">
            <span>Showing {rows.length} of <span className="mono">{totalCreators.toLocaleString()}</span> indexed creators</span>
            <Link href="/creators">Browse the full database →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

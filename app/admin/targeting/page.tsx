'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { withTimeout } from '@/lib/withTimeout';
import { compareTeaserStrength } from '@/lib/reports/teaser-strength';
import type { Platform } from '@/lib/reports/creator-brand-matches';
import type { RecencyBucket } from '@/lib/reports/recency-bucket';

type RankedCreator = {
  creatorId: string;
  handle: string;
  displayName: string | null;
  platform: Platform;
  followerCount: number;
  detectedCountry: string | null;
  detectedNiche: string | null;
  totalMatchCount: number;
  programCount: number;
  strongestRecencyBucket: RecencyBucket | null;
  hasRegionMatch: boolean;
  claimed: boolean;
  outreachStatus: 'not_contacted' | 'dmed';
  dmedAt: string | null;
  isSpanish: boolean;
  teaserLive: boolean;
  dmLink: string;
  strength: { totalMatchCount: number; programCount: number; strongestRecencyRank: number; hasRegionMatch: boolean; hasDetectedNiche: boolean };
};

type TargetingResponse = {
  results: RankedCreator[];
  window: { batch: number; size: number; candidateCount: number; hasMore: boolean };
  matchedCount: number;
  language: { spanishCount: number; liveCount: number };
};

const FETCH_TIMEOUT_MS = 45_000;

const RECENCY_COLORS: Record<RecencyBucket, { color: string; bg: string; label: string }> = {
  active: { color: '#065F46', bg: '#ECFDF5', label: 'Active' },
  window: { color: '#92400E', bg: '#FFFBEB', label: 'Recent' },
  neutral: { color: '#6B7280', bg: '#F3F4F6', label: 'Older' },
};

export default function AdminTargetingPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  const [country, setCountry] = useState('');
  const [niche, setNiche] = useState('');
  const [followerMin, setFollowerMin] = useState('');
  const [followerMax, setFollowerMax] = useState('');

  const [hideDmed, setHideDmed] = useState(false);
  const [onlyClaimed, setOnlyClaimed] = useState(false);

  const [segmentLoaded, setSegmentLoaded] = useState(false);
  const [matchedCount, setMatchedCount] = useState(0);
  const [language, setLanguage] = useState<{ spanishCount: number; liveCount: number } | null>(null);
  const [nextBatch, setNextBatch] = useState(0);
  const [hasMoreBatches, setHasMoreBatches] = useState(false);
  const [rankedSoFar, setRankedSoFar] = useState(0);
  const [results, setResults] = useState<RankedCreator[]>([]);

  const [dataLoading, setDataLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingCreatorId, setUpdatingCreatorId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (loading) return;
    if (!user || userRole !== 'admin') { router.push('/login'); return; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, userRole]);

  async function fetchBatch(targetBatch: number, replace: boolean) {
    const seq = ++requestSeq.current;
    setDataLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (country.trim()) params.set('country', country.trim());
      if (niche.trim()) params.set('niche', niche.trim());
      if (followerMin.trim()) params.set('followerMin', followerMin.trim());
      if (followerMax.trim()) params.set('followerMax', followerMax.trim());
      params.set('batch', String(targetBatch));

      const res = await withTimeout(fetch(`/api/admin/targeting?${params.toString()}`), FETCH_TIMEOUT_MS);
      const json = (await res.json()) as TargetingResponse & { error?: string };
      if (seq !== requestSeq.current) return; // a newer request already superseded this one
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');

      setMatchedCount(json.matchedCount);
      setLanguage(json.language);
      setHasMoreBatches(json.window.hasMore);
      setNextBatch(targetBatch + 1);
      setResults((prev) => {
        const merged = replace ? json.results : [...prev, ...json.results];
        return [...merged].sort((a, b) => compareTeaserStrength(a.strength, b.strength));
      });
      setRankedSoFar((prev) => (replace ? json.window.candidateCount : prev + json.window.candidateCount));
      setSegmentLoaded(true);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('Failed to load targeting segment:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      if (seq === requestSeq.current) setDataLoading(false);
    }
  }

  function loadSegment() {
    setResults([]);
    setRankedSoFar(0);
    fetchBatch(0, true);
  }

  function computeNextWindow() {
    fetchBatch(nextBatch, false);
  }

  async function setOutreachStatus(creatorId: string, status: 'not_contacted' | 'dmed') {
    setUpdatingCreatorId(creatorId);
    setUpdateError(null);
    try {
      const res = await withTimeout(
        fetch('/api/admin/targeting/outreach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creatorId, status }),
        }),
        15_000,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to update');
      setResults((prev) =>
        prev.map((r) => (r.creatorId === creatorId ? { ...r, outreachStatus: status, dmedAt: status === 'dmed' ? new Date().toISOString() : null } : r)),
      );
    } catch (err) {
      console.error('Failed to update outreach status:', err);
      setUpdateError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdatingCreatorId(null);
    }
  }

  async function copyLink(row: RankedCreator) {
    const fullUrl = `${window.location.origin}${row.dmLink}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedHandle(row.handle);
      setTimeout(() => setCopiedHandle((h) => (h === row.handle ? null : h)), 1500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }

  if (loading) return null;
  if (!user || userRole !== 'admin') return null;

  const visibleResults = results.filter((r) => {
    if (hideDmed && r.outreachStatus === 'dmed') return false;
    if (onlyClaimed && !r.claimed) return false;
    return true;
  });

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Creator Targeting</h1>
      <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 24px 0' }}>
        Filter creators, rank the segment by teaser strength (how compelling their /claim/[handle] page would be), and track outreach.
        Strength is computed live from getCreatorBrandMatches — never a stored score.
      </p>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={labelStyle}>Country</label>
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Colombia" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Niche</label>
          <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. beauty" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Followers min</label>
          <input value={followerMin} onChange={(e) => setFollowerMin(e.target.value)} placeholder="0" type="number" style={{ ...inputStyle, width: '110px' }} />
        </div>
        <div>
          <label style={labelStyle}>Followers max</label>
          <input value={followerMax} onChange={(e) => setFollowerMax(e.target.value)} placeholder="no limit" type="number" style={{ ...inputStyle, width: '110px' }} />
        </div>
        <button onClick={loadSegment} disabled={dataLoading} style={primaryBtnStyle(dataLoading)}>
          {dataLoading ? 'Loading…' : 'Load segment'}
        </button>
      </div>

      {segmentLoaded && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151' }}>
            <input type="checkbox" checked={hideDmed} onChange={(e) => setHideDmed(e.target.checked)} /> Hide DMed
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151' }}>
            <input type="checkbox" checked={onlyClaimed} onChange={(e) => setOnlyClaimed(e.target.checked)} /> Only claimed
          </label>
        </div>
      )}

      {updateError && <p style={{ color: '#DC2626', fontSize: '13px', margin: '0 0 12px 0' }}>{updateError}</p>}

      {!segmentLoaded && !dataLoading && !loadError && (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Set filters and click &quot;Load segment&quot; to rank a creator segment.</p>
      )}

      {loadError && (
        <div>
          <p style={{ color: '#DC2626', fontSize: '14px', margin: '0 0 8px 0' }}>Failed to load — {loadError}</p>
          <button onClick={() => fetchBatch(segmentLoaded ? nextBatch - 1 : 0, results.length === 0)} style={retryBtnStyle}>
            Retry
          </button>
        </div>
      )}

      {segmentLoaded && !loadError && (
        <>
          <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#374151' }}>
            <strong>{matchedCount}</strong> creators match this filter — ranked <strong>{rankedSoFar}</strong> of them so far (window size 150 per batch).
            {language && (
              <>
                {' '}<strong>{language.liveCount}</strong> have a live English teaser; <strong>{language.spanishCount}</strong> need the Spanish teaser (not live yet).
              </>
            )}
            {hasMoreBatches && (
              <div style={{ marginTop: '8px' }}>
                <button onClick={computeNextWindow} disabled={dataLoading} style={secondaryBtnStyle(dataLoading)}>
                  {dataLoading ? 'Computing…' : 'Compute next 150'}
                </button>
              </div>
            )}
          </div>

          {dataLoading && results.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Computing teaser strength for up to 150 creators — this can take a few seconds…</p>
          ) : visibleResults.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No creators match the current view filters.</p>
          ) : (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <th style={thStyle}>Creator</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Followers</th>
                    <th style={thStyle}>Niche</th>
                    <th style={thStyle}>Country</th>
                    <th style={thStyle}>Strength</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Claimed</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Outreach</th>
                    <th style={thStyle}>DM link</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleResults.map((row) => {
                    const recency = row.strongestRecencyBucket ? RECENCY_COLORS[row.strongestRecencyBucket] : null;
                    const isUpdating = updatingCreatorId === row.creatorId;
                    return (
                      <tr key={row.creatorId} style={{ borderBottom: '1px solid #F3F4F6', opacity: isUpdating ? 0.6 : 1 }}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600, color: '#3A3A3A' }}>{row.displayName ?? `@${row.handle}`}</div>
                          <div style={{ color: '#9CA3AF', fontSize: '12px' }}>@{row.handle} · {row.platform}</div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{row.followerCount.toLocaleString('en-US')}</td>
                        <td style={{ ...tdStyle, color: row.detectedNiche ? '#3A3A3A' : '#D1D5DB' }}>{row.detectedNiche ?? '—'}</td>
                        <td style={{ ...tdStyle, color: '#6B7280' }}>{row.detectedCountry ?? '—'}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#374151' }}>{row.programCount} program{row.programCount === 1 ? '' : 's'} · {row.totalMatchCount} match{row.totalMatchCount === 1 ? '' : 'es'}</span>
                            {recency && <span style={badgeStyle(recency.color, recency.bg)}>{recency.label}</span>}
                            {row.hasRegionMatch && <span style={badgeStyle('#1E40AF', '#EFF6FF')}>Region match</span>}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {row.claimed ? <span style={badgeStyle('#065F46', '#ECFDF5')}>Claimed</span> : <span style={{ color: '#D1D5DB' }}>—</span>}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {row.outreachStatus === 'dmed' ? (
                            <div>
                              <span style={badgeStyle('#92400E', '#FFFBEB')}>DMed</span>
                              <div>
                                <button onClick={() => setOutreachStatus(row.creatorId, 'not_contacted')} disabled={isUpdating} style={undoBtnStyle}>Undo</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setOutreachStatus(row.creatorId, 'dmed')} disabled={isUpdating} style={markDmedBtnStyle}>
                              Mark DMed
                            </button>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {!row.teaserLive && (
                              <span style={{ ...badgeStyle('#991B1B', '#FEF2F2'), width: 'fit-content' }}>Spanish teaser not live — do not send</span>
                            )}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => copyLink(row)} disabled={!row.teaserLive} style={linkBtnStyle(!row.teaserLive)} title={!row.teaserLive ? 'Spanish teaser not live yet' : 'Copy link'}>
                                {copiedHandle === row.handle ? 'Copied!' : 'Copy link'}
                              </button>
                              {row.teaserLive ? (
                                <a href={row.dmLink} target="_blank" rel="noreferrer" style={previewLinkStyle}>Preview</a>
                              ) : (
                                <span style={{ ...previewLinkStyle, color: '#D1D5DB', cursor: 'default' }} title="Would 404 — Spanish teaser not live">Preview</span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' };
const inputStyle: React.CSSProperties = { padding: '7px 10px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', width: '160px' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' };
const tdStyle: React.CSSProperties = { padding: '8px 14px', color: '#3A3A3A', verticalAlign: 'top' };

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return { padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: disabled ? 'default' : 'pointer', border: 'none', backgroundColor: '#FFD700', color: 'white', opacity: disabled ? 0.6 : 1 };
}
function secondaryBtnStyle(disabled: boolean): React.CSSProperties {
  return { padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: disabled ? 'default' : 'pointer', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', opacity: disabled ? 0.6 : 1 };
}
const retryBtnStyle: React.CSSProperties = { padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: '#FFD700', color: 'white' };
const markDmedBtnStyle: React.CSSProperties = { padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151' };
const undoBtnStyle: React.CSSProperties = { padding: '2px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none', color: '#9CA3AF', textDecoration: 'underline', marginTop: '2px' };

function linkBtnStyle(disabled: boolean): React.CSSProperties {
  return { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: disabled ? 'default' : 'pointer', border: '1px solid #E5E7EB', backgroundColor: disabled ? '#F9FAFB' : 'white', color: disabled ? '#D1D5DB' : '#374151' };
}
const previewLinkStyle: React.CSSProperties = { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', textDecoration: 'none', display: 'inline-block' };

function badgeStyle(color: string, bg: string): React.CSSProperties {
  return { padding: '3px 8px', borderRadius: '999px', backgroundColor: bg, fontSize: '11px', fontWeight: 600, color };
}

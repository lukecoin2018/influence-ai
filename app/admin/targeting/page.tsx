'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { withTimeout } from '@/lib/withTimeout';
import { compareTeaserStrength } from '@/lib/reports/teaser-strength';
import type { Platform } from '@/lib/reports/creator-brand-matches';
import type { RecencyBucket } from '@/lib/reports/recency-bucket';
// The claim page's own greeting-name resolver, imported rather than
// reimplemented: it is emoji- and NFKC-safe, and the DM's whole premise is
// that it opens with the same name the teaser headline does.
import { resolveGreetingName } from '@/app/claim/[handle]/_data';
import { formatCount } from '@/lib/formatters';
import { buildDmMessage, variantForCreator, type DmVariant } from '@/lib/admin/dm-messages';

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
  /** Recorded at send time by the API; null before migration 0014 lands or before contact. */
  sentVariant: string | null;
  sentMatchCount: number | null;
  isSpanish: boolean;
  dmLink: string;
  strength: { totalMatchCount: number; programCount: number; strongestRecencyRank: number; hasRegionMatch: boolean; hasDetectedNiche: boolean };
};

type TargetingResponse = {
  results: RankedCreator[];
  window: { batch: number; size: number; candidateCount: number; hasMore: boolean };
  matchedCount: number;
  language: { spanishCount: number; englishCount: number };
};

const FETCH_TIMEOUT_MS = 45_000;

/**
 * Whether a DM can be generated for this row at all. Both conditions hide the
 * button outright rather than disabling it — a disabled control still says
 * "this is a thing you could do here", and neither of these is.
 *
 *  - Instagram only. TikTok verification has never run successfully, so a
 *    TikTok creator who taps through cannot finish claiming (CLAUDE.md's
 *    standing "don't DM TikTok creators" item, ~55% of the database).
 *  - At least one match. At zero the claim page renders ZeroMatchState —
 *    "we haven't detected a brand match for you yet" — so a DM promising
 *    "0 brands we've detected hiring" would contradict the page it opens.
 */
function canGenerateDm(row: RankedCreator): boolean {
  return row.platform === 'instagram' && row.totalMatchCount > 0;
}

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
  const [language, setLanguage] = useState<{ spanishCount: number; englishCount: number } | null>(null);
  const [nextBatch, setNextBatch] = useState(0);
  const [hasMoreBatches, setHasMoreBatches] = useState(false);
  const [rankedSoFar, setRankedSoFar] = useState(0);
  const [results, setResults] = useState<RankedCreator[]>([]);

  const [dataLoading, setDataLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingCreatorId, setUpdatingCreatorId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);
  // The open DM draft, if any — one at a time, keyed by creator. `text` is
  // the EDITED text, not a derived value: the draft is a starting point the
  // admin rewrites before sending, so it must survive re-renders.
  //
  // `referenceText` is the OTHER variant, rendered read-only for comparison.
  // Both strings are built in openDmDraft rather than during render because
  // they need window.location.origin, and this route prerenders (it builds as
  // Static) — touching window in a render path would break the build.
  const [dmDraft, setDmDraft] = useState<{
    creatorId: string;
    variant: DmVariant;
    text: string;
    referenceVariant: DmVariant;
    referenceText: string;
  } | null>(null);
  const [dmCopied, setDmCopied] = useState(false);
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

  async function setOutreachStatus(row: RankedCreator, status: 'not_contacted' | 'dmed') {
    const { creatorId } = row;
    setUpdatingCreatorId(creatorId);
    setUpdateError(null);
    // Only stamp the A/B fields for creators the generator would actually have
    // written a DM for. Marking a TikTok or zero-match creator DMed by hand
    // records a real send, but not one of THESE messages — attaching a variant
    // to it would put a row in the experiment that never saw either variant.
    const recordVariant = status === 'dmed' && canGenerateDm(row);
    const variant = recordVariant ? variantForCreator(creatorId) : null;
    try {
      const res = await withTimeout(
        fetch('/api/admin/targeting/outreach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorId,
            status,
            ...(recordVariant ? { variant, sentMatchCount: row.totalMatchCount } : {}),
          }),
        }),
        15_000,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to update');
      setResults((prev) =>
        prev.map((r) =>
          r.creatorId === creatorId
            ? {
                ...r,
                outreachStatus: status,
                dmedAt: status === 'dmed' ? new Date().toISOString() : null,
                sentVariant: status === 'dmed' ? variant : null,
                sentMatchCount: status === 'dmed' && recordVariant ? row.totalMatchCount : null,
              }
            : r,
        ),
      );
    } catch (err) {
      console.error('Failed to update outreach status:', err);
      setUpdateError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdatingCreatorId(null);
    }
  }

  function openDmDraft(row: RankedCreator) {
    // The assigned variant, and ONLY the assigned variant, is what gets sent
    // and recorded. It stays a deterministic hash of creatorId — deliberately
    // not selectable, because letting the admin pick which message a given
    // creator receives would make the assignment non-random and quietly
    // destroy the A/B this records.
    const variant = variantForCreator(row.creatorId);
    const referenceVariant: DmVariant = variant === 'A' ? 'B' : 'A';
    const common = {
      // Same isSpanish that produced row.dmLink server-side, so the message
      // body and the link inside it can never end up in different languages.
      locale: row.isSpanish ? ('es' as const) : ('en' as const),
      greetingName: resolveGreetingName(row.displayName, row.handle),
      matchCount: row.totalMatchCount,
      followersFormatted: formatCount(row.followerCount),
      // Built exactly as copyLink() below does — never re-derived.
      url: `${window.location.origin}${row.dmLink}`,
    };
    setDmCopied(false);
    setDmDraft({
      creatorId: row.creatorId,
      variant,
      text: buildDmMessage({ ...common, variant }),
      referenceVariant,
      referenceText: buildDmMessage({ ...common, variant: referenceVariant }),
    });
  }

  async function copyDmDraft() {
    if (!dmDraft) return;
    try {
      await navigator.clipboard.writeText(dmDraft.text);
      setDmCopied(true);
      setTimeout(() => setDmCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy DM:', err);
    }
  }

  /**
   * The same copy, started but deliberately NOT awaited, for the anchor that
   * also opens the DM thread. Awaiting would push the navigation out of the
   * click's synchronous path; starting it here runs the clipboard API's
   * focus/permission check while this document is still focused, which is
   * what actually determines whether the write survives.
   */
  function copyDmDraftFireAndForget() {
    if (!dmDraft) return;
    const text = dmDraft.text;
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setDmCopied(true);
        setTimeout(() => setDmCopied(false), 1500);
      })
      .catch((err) => console.error('Failed to copy DM:', err));
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
                {' '}<strong>{language.englishCount}</strong> get the English teaser (/claim); <strong>{language.spanishCount}</strong> get the Spanish teaser (/es/claim).
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
                    const draftOpen = dmDraft?.creatorId === row.creatorId;
                    return (
                      <Fragment key={row.creatorId}>
                      <tr style={{ borderBottom: '1px solid #F3F4F6', opacity: isUpdating ? 0.6 : 1 }}>
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
                              {row.sentVariant && (
                                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                                  sent {row.sentVariant}
                                  {row.sentMatchCount != null && ` · ${row.sentMatchCount} matches`}
                                </div>
                              )}
                              <div>
                                <button onClick={() => setOutreachStatus(row, 'not_contacted')} disabled={isUpdating} style={undoBtnStyle}>Undo</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setOutreachStatus(row, 'dmed')} disabled={isUpdating} style={markDmedBtnStyle}>
                              Mark DMed
                            </button>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => copyLink(row)} style={linkBtnStyle(false)} title="Copy link">
                              {copiedHandle === row.handle ? 'Copied!' : 'Copy link'}
                            </button>
                            {/* Absent, not disabled, for TikTok and zero-match creators — see canGenerateDm. */}
                            {canGenerateDm(row) && (
                              <button
                                onClick={() => (draftOpen ? setDmDraft(null) : openDmDraft(row))}
                                style={linkBtnStyle(false)}
                                title="Draft a ready-to-paste DM"
                              >
                                {draftOpen ? 'Close DM' : 'Copy DM'}
                              </button>
                            )}
                            <a href={row.dmLink} target="_blank" rel="noreferrer" style={previewLinkStyle}>Preview</a>
                          </div>
                        </td>
                      </tr>
                      {draftOpen && dmDraft && (
                        <tr style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: '#FAFAFA' }}>
                          <td colSpan={8} style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                              <span style={badgeStyle('#3730A3', '#EEF2FF')}>Variant {dmDraft.variant}</span>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                                {row.isSpanish ? 'Spanish' : 'English'} · @{row.handle}
                              </span>
                              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                                Draft — edit freely before sending. Editing does not change the recorded variant.
                              </span>
                            </div>
                            <textarea
                              value={dmDraft.text}
                              onChange={(e) => setDmDraft((d) => (d ? { ...d, text: e.target.value } : d))}
                              rows={4}
                              style={dmTextareaStyle}
                            />
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                              <button onClick={copyDmDraft} style={linkBtnStyle(false)}>
                                {dmCopied ? 'Copied!' : 'Copy message'}
                              </button>
                              {/*
                                An anchor, not a button calling window.open(). A scripted
                                window.open() after `await clipboard.writeText()` is subject to
                                the popup blocker — measured returning null even with transient
                                activation still live — whereas activating a real anchor is a
                                native navigation that is never blocked. The clipboard write is
                                fired here rather than awaited: its focus/permission check runs
                                at invocation, which is during the gesture while this document
                                still has focus, so the copy cannot be dropped by the new tab
                                taking focus. Measured: write resolves, document still focused.

                                ig.me/m/<handle> per CLAUDE.md — verified on desktop and mobile
                                web. On mobile this opens the browser, not the app; the
                                instagram:// scheme is deliberately NOT used to force the app.
                              */}
                              <a
                                href={`https://ig.me/m/${row.handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => copyDmDraftFireAndForget()}
                                style={previewLinkStyle}
                                title="Copy the message above, then open the Instagram DM thread"
                              >
                                Copy &amp; open DM
                              </a>
                              <button onClick={() => openDmDraft(row)} style={linkBtnStyle(false)} title="Discard edits and rebuild from the row">
                                Reset
                              </button>
                            </div>

                            {/*
                              The variant this creator did NOT get, read-only, for comparison
                              only. Rendered as text rather than a second textarea so there is
                              no affordance suggesting it can be sent: no editing, no copy
                              button, and it is not part of what Mark DMed records.
                            */}
                            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #E5E7EB' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                                <span style={badgeStyle('#6B7280', '#F3F4F6')}>Variant {dmDraft.referenceVariant}</span>
                                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                                  Reference only — not assigned to this creator, not sent, not recorded.
                                </span>
                              </div>
                              <div style={dmReferenceStyle}>{dmDraft.referenceText}</div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
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
const dmTextareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #E5E7EB',
  fontSize: '13px',
  lineHeight: 1.5,
  fontFamily: 'inherit',
  color: '#3A3A3A',
  resize: 'vertical',
};
/** Read-only reference copy of the unassigned variant — muted, non-editable, no controls. */
const dmReferenceStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px dashed #E5E7EB',
  backgroundColor: '#F9FAFB',
  fontSize: '13px',
  lineHeight: 1.5,
  color: '#9CA3AF',
};
const previewLinkStyle: React.CSSProperties = { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', textDecoration: 'none', display: 'inline-block' };

function badgeStyle(color: string, bg: string): React.CSSProperties {
  return { padding: '3px 8px', borderRadius: '999px', backgroundColor: bg, fontSize: '11px', fontWeight: 600, color };
}

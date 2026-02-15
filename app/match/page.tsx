'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, RotateCcw } from 'lucide-react';
import { formatCount } from '@/lib/formatters';
import { EngagementIndicator } from '@/components/EngagementIndicator';

interface MatchResult {
  creator_id: string;
  handle: string;
  name: string;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  total_followers: number;
  instagram_followers: number | null;
  tiktok_followers: number | null;
  instagram_engagement: number | null;
  tiktok_engagement: number | null;
  score: number;
  explanation: string;
  enrichment: any;
}

interface MatchResponse {
  matches: MatchResult[];
  summary: string;
  candidatesEvaluated: number;
}

function ScoreBadge({ score }: { score: number }) {
  const config = score >= 90
    ? { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', label: 'Excellent Match' }
    : score >= 75
    ? { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Strong Match' }
    : score >= 60
    ? { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', label: 'Good Match' }
    : { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', label: 'Moderate Match' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: config.bg, border: `2px solid ${config.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '18px', fontWeight: 800, color: config.color }}>{score}</span>
      </div>
      <span style={{ fontSize: '10px', fontWeight: 600, color: config.color, textAlign: 'center', lineHeight: '1.2' }}>{config.label}</span>
    </div>
  );
}

function AvatarFallback({ name }: { name: string }) {
  const initials = (name ?? '??').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: '14px', fontWeight: 700, color: '#7C3AED' }}>{initials}</span>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.05a8.16 8.16 0 004.77 1.52V7.12a4.85 4.85 0 01-1-.43z"/>
    </svg>
  );
}

function MatchCard({ result, rank }: { result: MatchResult; rank: number }) {
  const engagement = result.instagram_engagement ?? result.tiktok_engagement;
  const calcEngagement = result.enrichment?.calculated_engagement_rate;

  return (
    <div className="card" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF' }}>#{rank}</span>
        <ScoreBadge score={result.score} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <AvatarFallback name={result.name} />
          <div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>{result.name}</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {result.instagram_handle && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#E1306C', fontWeight: 500 }}>
                  <InstagramIcon />@{result.instagram_handle}
                </span>
              )}
              {result.tiktok_handle && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#010101', fontWeight: 500 }}>
                  <TikTokIcon />@{result.tiktok_handle}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Followers</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{formatCount(result.total_followers)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Engagement</span>
            <EngagementIndicator rate={calcEngagement ?? engagement} showLabel={false} size="sm" />
          </div>
          {result.enrichment?.posting_frequency_per_week && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Posts/Week</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{result.enrichment.posting_frequency_per_week}</span>
            </div>
          )}
          {result.enrichment?.days_since_last_post !== undefined && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last Active</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{result.enrichment.days_since_last_post}d ago</span>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: '#F5F3FF', borderRadius: '10px', padding: '14px', marginBottom: '14px', borderLeft: '3px solid #7C3AED' }}>
          <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: 0 }}>{result.explanation}</p>
        </div>

        {result.enrichment?.top_hashtags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {result.enrichment.top_hashtags.slice(0, 6).map((tag: string) => (
              <span key={tag} style={{ padding: '2px 8px', borderRadius: '999px', backgroundColor: '#EDE9FE', color: '#7C3AED', fontSize: '11px', fontWeight: 500 }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <Link href={`/creators/${result.handle}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', backgroundColor: '#7C3AED', color: 'white', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
          View Full Profile <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

function LoadingState({ candidateCount }: { candidateCount: number }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', animation: 'pulse 2s infinite' }}>
        <Sparkles size={28} color="white" />
      </div>
      <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
        Analyzing {candidateCount > 0 ? candidateCount : '...'} creators against your brief
      </p>
      <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
        Our AI is evaluating content style, engagement quality, and brand fit...
      </p>
    </div>
  );
}

const EXAMPLE_BRIEFS = [
  "We're a sustainable streetwear brand launching recycled denim. Looking for authentic creators who post styling content, not overly polished. Bonus if they've worked with eco-fashion brands.",
  "Premium skincare brand targeting women 25-40. Need creators with high engagement who do genuine product reviews. Prefer creators who mix beauty with lifestyle content.",
  "New fitness app looking for micro-influencers who post workout content and healthy living tips. Prefer relatable creators, not intimidating gym content.",
];

export default function MatchPage() {
  const [briefText, setBriefText] = useState('');
  const [platform, setPlatform] = useState('');
  const [minFollowers, setMinFollowers] = useState('');
  const [maxFollowers, setMaxFollowers] = useState('');
  const [minEngagement, setMinEngagement] = useState('');
  const [contentPref, setContentPref] = useState('any');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchResponse | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (briefText.trim().length < 20) {
      setError('Please write at least 20 characters describing your brand and campaign.');
      return;
    }
    setError('');
    setLoading(true);
    setResults(null);

    try {
      const body: any = { briefText };
      if (platform) body.platform = platform;
      if (minFollowers) body.minFollowers = parseInt(minFollowers);
      if (maxFollowers) body.maxFollowers = parseInt(maxFollowers);
      if (minEngagement) body.minEngagement = parseFloat(minEngagement);
      if (contentPref !== 'any') body.contentTypePref = contentPref;

      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Matching failed');
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-4xl mx-auto px-6" style={{ paddingTop: '48px', paddingBottom: '80px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', backgroundColor: '#EDE9FE', marginBottom: '16px' }}>
            <Sparkles size={14} color="#7C3AED" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#7C3AED' }}>AI-Powered Matching</span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#111827', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
            Find Your Perfect Creators
          </h1>
          <p style={{ fontSize: '16px', color: '#6B7280', margin: 0, maxWidth: '540px', marginLeft: 'auto', marginRight: 'auto' }}>
            Describe your brand and campaign — our AI will match you with the best creators in our network.
          </p>
        </div>

        {!results && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Brief */}
            <div className="card" style={{ padding: '28px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                Your Brief <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 12px 0' }}>
                Describe your brand, campaign goals, and what kind of creator you're looking for.
              </p>
              <textarea
                value={briefText}
                onChange={(e) => setBriefText(e.target.value)}
                placeholder={EXAMPLE_BRIEFS[0]}
                rows={6}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', color: '#111827', lineHeight: '1.6', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Examples:</span>
                {EXAMPLE_BRIEFS.map((brief, i) => (
                  <button key={i} onClick={() => setBriefText(brief)} style={{ fontSize: '12px', color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                    Example {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: '0 0 20px 0' }}>Filters <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                {/* Platform */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Platform</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[['', 'All'], ['instagram', 'Instagram'], ['tiktok', 'TikTok']].map(([val, label]) => (
                      <button key={val} onClick={() => setPlatform(val)} style={{ flex: 1, padding: '7px 4px', borderRadius: '6px', border: `1px solid ${platform === val ? '#7C3AED' : '#E5E7EB'}`, backgroundColor: platform === val ? '#EDE9FE' : 'white', color: platform === val ? '#7C3AED' : '#6B7280', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Min Followers */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Min Followers</label>
                  <input type="number" value={minFollowers} onChange={(e) => setMinFollowers(e.target.value)} placeholder="10,000" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '13px', color: '#111827', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Max Followers */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Max Followers</label>
                  <input type="number" value={maxFollowers} onChange={(e) => setMaxFollowers(e.target.value)} placeholder="1,000,000" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '13px', color: '#111827', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Min Engagement */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Min Engagement %</label>
                  <input type="number" value={minEngagement} onChange={(e) => setMinEngagement(e.target.value)} placeholder="2.0" step="0.1" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '13px', color: '#111827', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Content Preference */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Content Preference</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[['any', 'Any'], ['reels', 'Mostly Reels/Video'], ['photos', 'Mostly Photos'], ['mixed', 'Mixed']].map(([val, label]) => (
                      <button key={val} onClick={() => setContentPref(val)} style={{ padding: '7px 12px', borderRadius: '6px', border: `1px solid ${contentPref === val ? '#7C3AED' : '#E5E7EB'}`, backgroundColor: contentPref === val ? '#EDE9FE' : 'white', color: contentPref === val ? '#7C3AED' : '#6B7280', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '14px' }}>
                {error}
              </div>
            )}

            <button onClick={handleSubmit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px 32px', borderRadius: '12px', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: 'white', fontSize: '16px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)' }}>
              <Sparkles size={18} />
              Find My Creators
            </button>
          </div>
        )}

        {loading && <LoadingState candidateCount={0} />}

        {results && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Results header */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: '0 0 4px 0' }}>Your Matches</h2>
                  <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>We evaluated {results.candidatesEvaluated} creators against your brief</p>
                </div>
                <button onClick={() => { setResults(null); setError(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#6B7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  <RotateCcw size={13} /> Refine Search
                </button>
              </div>
              <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#F5F3FF', borderLeft: '3px solid #7C3AED' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: 0 }}>{results.summary}</p>
              </div>
            </div>

            {/* Match cards */}
            {results.matches.map((match, i) => (
              <MatchCard key={match.creator_id} result={match} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
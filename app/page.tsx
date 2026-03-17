import Link from 'next/link';
import { ArrowRight, Users, BarChart2, FileText, Sparkles, Handshake } from 'lucide-react';
import { CreatorCard } from '@/components/CreatorCard';
import { supabase } from '@/lib/supabase';
import type { Creator } from '@/lib/types';

// ─── Data fetching (unchanged from original) ──────────────────────────────────

async function getFeaturedCreators(): Promise<Creator[]> {
  const { data } = await supabase
    .from('creators')
    .select('*')
    .eq('is_featured', true)
    .order('display_order', { ascending: true })
    .limit(8);
  return (data ?? []) as Creator[];
}

async function getStats() {
  const { data } = await supabase
    .from('creators')
    .select('engagement_rate, category_name');

  if (!data) return { totalCreators: 0, avgEngagementRate: 0, categoryCount: 0 };

  const totalCreators = data.length;
  const rates = data.map((c) => c.engagement_rate).filter((r): r is number => r != null);
  const avgEngagementRate = rates.length > 0
    ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10
    : 0;
  const categoryCount = new Set(data.map((c) => c.category_name).filter(Boolean)).size;

  return { totalCreators, avgEngagementRate, categoryCount };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [featuredCreators, stats] = await Promise.all([getFeaturedCreators(), getStats()]);

  return (
    <div style={{ backgroundColor: '#FAFAFA' }}>

      {/* ======================================================================
          SECTION 1 — HERO
      ====================================================================== */}
      <section className="max-w-7xl mx-auto text-center" style={{ padding: '56px 24px 64px' }}>

        {/* Badge — keeps existing dynamic creator count */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          backgroundColor: '#FFF9E0', borderRadius: '999px',
          padding: '6px 16px', marginBottom: '28px',
          border: '1px solid #FFD70040',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FFD700' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#b89a00' }}>
            {stats.totalCreators.toLocaleString()}+ verified creators across Instagram &amp; TikTok
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(34px, 6vw, 60px)', fontWeight: 800,
          textAlign: 'center', color: '#3A3A3A',
          margin: '0 0 20px 0', lineHeight: '1.1',
          letterSpacing: '-0.03em', maxWidth: '820px',
          marginLeft: 'auto', marginRight: 'auto',
        }}>
          Find the right creators for your brand —{' '}
          <span style={{ color: '#FF4D94' }}>powered by AI</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto" style={{
          fontSize: 'clamp(16px, 2vw, 19px)', color: '#6B7280',
          margin: '0 auto 40px', maxWidth: '580px', lineHeight: '1.65',
        }}>
          Discover and match with verified Instagram and TikTok creators using
          AI-powered search, real engagement data, and professional campaign tools.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/creators"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '14px 28px', borderRadius: '10px',
              backgroundColor: '#FF4D94', color: 'white',
              fontSize: '15px', fontWeight: 600, textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(255,77,148,0.35)',
            }}
          >
            Explore Creators
            <ArrowRight size={16} />
          </Link>
          <a
            href="#how-it-works"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '14px 28px', borderRadius: '10px',
              backgroundColor: 'white', color: '#3A3A3A',
              fontSize: '15px', fontWeight: 600, textDecoration: 'none',
              border: '1.5px solid #E5E7EB',
            }}
          >
            See How It Works
          </a>
        </div>
      </section>

      {/* ======================================================================
          SECTION 2 — STATS BAR
          Kept all existing dynamic stats; added "2 Platforms" as a static stat.
      ====================================================================== */}
      <section style={{ backgroundColor: 'white', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
        <div className="max-w-7xl mx-auto flex justify-center flex-wrap" style={{ padding: '0 24px' }}>
          {[
            { label: 'Active Creators',       value: `${stats.totalCreators.toLocaleString()}+` },
            { label: 'Avg. Engagement Rate',  value: `${stats.avgEngagementRate}%` },
            { label: 'Categories',            value: stats.categoryCount.toString() },
            { label: 'Platforms',             value: '2', sub: 'Instagram & TikTok' },
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              className="flex-1"
              style={{
                padding: '28px 24px', textAlign: 'center',
                borderRight: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                minWidth: '120px',
              }}
            >
              <p style={{
                fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800,
                color: '#3A3A3A', margin: '0 0 4px 0', letterSpacing: '-0.02em',
              }}>
                {stat.value}
              </p>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontWeight: 500 }}>{stat.label}</p>
              {stat.sub && (
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0 0' }}>{stat.sub}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================================
          SECTION 3 — VALUE PROPOSITIONS
          Updated from generic cards to feature-specific highlights.
      ====================================================================== */}
      <section className="max-w-7xl mx-auto" style={{ padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800,
            color: '#3A3A3A', margin: '0 0 12px 0', letterSpacing: '-0.02em',
          }}>
            Everything you need to run great campaigns
          </h2>
          <p style={{ fontSize: '17px', color: '#6B7280', margin: '0 auto', maxWidth: '500px' }}>
            Built specifically for brands working with mid-tier creators —
            the sweet spot for engagement, authenticity, and affordability.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: Sparkles,
              iconColor: '#FF4D94',
              iconBg: '#FFF0F6',
              title: 'AI-Powered Matching',
              desc: 'Describe your ideal creator and let AI find the best matches from our verified database. Go beyond filters — our matching engine understands context, content style, and audience fit.',
            },
            {
              icon: BarChart2,
              iconColor: '#b89a00',
              iconBg: '#FFF9E0',
              title: 'Real Engagement Data',
              desc: 'Every profile includes real engagement rates, posting frequency, content mix, audience analytics, and growth trends — not vanity follower counts.',
            },
            {
              icon: Users,
              iconColor: '#3AAFF4',
              iconBg: '#EFF9FF',
              title: 'Instagram & TikTok',
              desc: 'Search across both platforms in one place. Filter by category, engagement rate, follower count, location, content type, and more.',
            },
            {
              icon: FileText,
              iconColor: '#3A3A3A',
              iconBg: '#F3F4F6',
              title: 'Campaign Tools Built In',
              desc: 'Campaign brief generator, budget calculator, negotiation assistant, and contract builder — everything you need from discovery to deal.',
            },
          ].map(({ icon: Icon, iconColor, iconBg, title, desc }) => (
            <div key={title} className="card" style={{ padding: '28px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '10px',
                backgroundColor: iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <Icon size={20} color={iconColor} strokeWidth={2} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px 0' }}>
                {title}
              </h3>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: '1.65' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================================
          SECTION 4 — HOW IT WORKS
          Updated steps to reflect actual brand workflow (Discover / Evaluate / Connect).
      ====================================================================== */}
      <section
        id="how-it-works"
        style={{ backgroundColor: '#3A3A3A', padding: '72px 24px' }}
      >
        <div className="max-w-7xl mx-auto">
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800,
              color: 'white', margin: '0 0 12px 0', letterSpacing: '-0.02em',
            }}>
              How it works
            </h2>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
              From first search to signed partnership — the full workflow, built in.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: '01', color: '#FFD700',
                title: 'Discover',
                desc: 'Browse 2,200+ verified Instagram and TikTok creators by niche, engagement rate, and audience size — or describe your campaign and let our AI find the best matches.',
              },
              {
                step: '02', color: '#FF4D94',
                title: 'Evaluate',
                desc: 'Compare creators side by side with real analytics. Use the budget calculator to estimate fair rates. Generate professional campaign briefs to align your team.',
              },
              {
                step: '03', color: '#3AAFF4',
                title: 'Connect',
                desc: 'Send partnership inquiries directly through the platform. Use the negotiation assistant for strategy and the contract builder to close deals professionally.',
              },
            ].map(({ step, color, title, desc }) => (
              <div key={step} style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div style={{
                  fontSize: '52px', fontWeight: 800, color: color,
                  marginBottom: '16px', letterSpacing: '-0.02em', lineHeight: 1,
                }}>
                  {step}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: '0 0 10px 0' }}>
                  {title}
                </h3>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: '1.65' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================================
          SECTION 5 — PLATFORM HIGHLIGHTS
          New section. Horizontal cards with icon + text.
      ====================================================================== */}
      <section className="max-w-7xl mx-auto" style={{ padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800,
            color: '#3A3A3A', margin: '0 0 12px 0', letterSpacing: '-0.02em',
          }}>
            Built for how brands actually work
          </h2>
          <p style={{ fontSize: '17px', color: '#6B7280', margin: '0 auto', maxWidth: '480px' }}>
            Every tool you need, in one place.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[
            {
              icon: Sparkles,
              iconColor: '#FF4D94',
              iconBg: '#FFF0F6',
              label: 'AI Match Engine',
              heading: 'Stop guessing. Start matching.',
              body: 'Tell us about your campaign — target audience, budget, goals — and our AI analyzes creator profiles, content patterns, and engagement data to recommend the best fits. Not just keyword matching — real understanding.',
              accent: '#FF4D94',
            },
            {
              icon: BarChart2,
              iconColor: '#b89a00',
              iconBg: '#FFF9E0',
              label: 'Creator Analytics',
              heading: 'Real data. Not vanity metrics.',
              body: 'Every creator profile includes engagement rate, posting frequency, content mix breakdown, top hashtags, average views, and similar creator recommendations. Data calculated from real posts, updated regularly.',
              accent: '#b89a00',
            },
            {
              icon: Handshake,
              iconColor: '#3AAFF4',
              iconBg: '#EFF9FF',
              label: 'End-to-End Campaign Tools',
              heading: 'From search to signed contract.',
              body: 'Budget calculators, campaign brief generators, AI negotiation strategies, and a professional contract builder. No switching between tools — everything lives where you discovered the creator.',
              accent: '#3AAFF4',
            },
          ].map(({ icon: Icon, iconColor, iconBg, label, heading, body, accent }) => (
            <div
              key={label}
              className="card"
              style={{
                padding: '36px',
                display: 'flex', gap: '28px', alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                backgroundColor: iconBg, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={24} color={iconColor} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <p style={{
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: accent, margin: '0 0 6px 0',
                }}>
                  {label}
                </p>
                <h3 style={{
                  fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 800,
                  color: '#3A3A3A', margin: '0 0 10px 0', letterSpacing: '-0.01em',
                }}>
                  {heading}
                </h3>
                <p style={{ fontSize: '15px', color: '#6B7280', margin: 0, lineHeight: '1.7', maxWidth: '640px' }}>
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================================
          SECTION 6 — FEATURED CREATORS (unchanged from original)
      ====================================================================== */}
      {featuredCreators.length > 0 && (
        <section style={{ backgroundColor: 'white', borderTop: '1px solid #E5E7EB', padding: '72px 0' }}>
          <div className="max-w-7xl mx-auto" style={{ padding: '0 24px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-end', marginBottom: '40px',
              flexWrap: 'wrap', gap: '16px',
            }}>
              <div>
                <h2 style={{
                  fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800,
                  color: '#3A3A3A', margin: '0 0 8px 0', letterSpacing: '-0.02em',
                }}>
                  Featured Creators
                </h2>
                <p style={{ fontSize: '16px', color: '#6B7280', margin: 0 }}>
                  Hand-picked creators across top categories.
                </p>
              </div>
              <Link
                href="/creators"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontSize: '14px', fontWeight: 600, color: '#FFD700', textDecoration: 'none',
                }}
              >
                View all {stats.totalCreators.toLocaleString()} creators <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredCreators.slice(0, 6).map((creator) => (
                <CreatorCard key={creator.creator_id} creator={creator} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ======================================================================
          SECTION 7 — SOCIAL PROOF / TRUST
          New section. Uses existing dynamic stats as large bold stat blocks.
      ====================================================================== */}
      <section style={{ borderTop: '1px solid #E5E7EB', padding: '72px 24px' }}>
        <div className="max-w-5xl mx-auto" style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800,
            color: '#3A3A3A', margin: '0 0 12px 0', letterSpacing: '-0.02em',
          }}>
            The numbers behind the platform
          </h2>
          <p style={{ fontSize: '17px', color: '#6B7280', margin: '0 auto 52px', maxWidth: '440px' }}>
            A growing network of verified, mid-tier creators ready to partner with brands like yours.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: `${stats.totalCreators.toLocaleString()}+`, label: 'Verified Creators',      color: '#FF4D94' },
              { value: stats.categoryCount.toString(),             label: 'Content Categories',      color: '#b89a00' },
              { value: `${stats.avgEngagementRate}%`,              label: 'Average Engagement Rate', color: '#3AAFF4' },
              { value: '2',                                        label: 'Platforms',               color: '#3A3A3A' },
            ].map(({ value, label, color }) => (
              <div key={label} className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
                <p style={{
                  fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 800,
                  color: color, margin: '0 0 8px 0', letterSpacing: '-0.03em', lineHeight: 1,
                }}>
                  {value}
                </p>
                <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, fontWeight: 500 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================================
          SECTION 8 — FINAL CTA
      ====================================================================== */}
      <section style={{
        backgroundColor: 'white', borderTop: '1px solid #E5E7EB',
        padding: '88px 24px', textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800,
          color: '#3A3A3A', margin: '0 0 16px 0', letterSpacing: '-0.02em',
        }}>
          Ready to find your perfect creator match?
        </h2>
        <p style={{
          fontSize: '17px', color: '#6B7280',
          margin: '0 auto 36px', maxWidth: '440px', lineHeight: '1.65',
        }}>
          Start exploring our verified creator database. Free to sign up.
        </p>
        <Link
          href="/signup"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '15px 32px', borderRadius: '10px',
            backgroundColor: '#FF4D94', color: 'white',
            fontSize: '16px', fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(255,77,148,0.35)',
          }}
        >
          Get Started Free
          <ArrowRight size={16} />
        </Link>

        {/* Subtle creator link per spec — not a primary CTA */}
        <p style={{ marginTop: '40px', fontSize: '13px', color: '#9CA3AF' }}>
          Are you a creator?{' '}
          <Link
            href="/creators"
            style={{ color: '#6B7280', textDecoration: 'underline', fontWeight: 500 }}
          >
            Find and claim your profile →
          </Link>
        </p>
      </section>

    </div>
  );
}

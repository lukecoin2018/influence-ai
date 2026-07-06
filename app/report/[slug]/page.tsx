// app/report/[slug]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { getPublicStats } from '@/app/_queries';
import {
  resolveCanonicalBrand,
  getBrandActivity,
  suggestCompetitors,
  getCompetitorActivities,
  type BrandActivity,
} from '@/lib/reports/brand-activity';
import { getMatchedCreators } from '@/lib/reports/matching';
import Link from 'next/link';
import { formatEngagementRate, formatDate } from '@/lib/formatters';
import { NamedCreatorCard } from './_components/NamedCreatorCard';
import CreatorCard from '@/app/discover/_components/CreatorCard';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: report } = await supabase.from('brand_reports').select('brand_name').eq('slug', slug).maybeSingle();

  return {
    title: report ? `${report.brand_name} — Creator Report` : 'Creator Report',
    robots: { index: false, follow: false },
  };
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
      <b style={{ fontWeight: 800, fontSize: 'clamp(1.3rem, 2.4vw, 1.7rem)', letterSpacing: '-0.02em', color: '#111' }}>{value}</b>
      <span style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: '#3A3A3A' }}>{label}</span>
    </div>
  );
}

// Matches home.css's dark (--muted-d on --bg) vs light (--muted-l on --surface) text rhythm.
const SECTION_THEME = {
  dark: { eyebrow: '#9B9890', title: '#F2F0EA', subtitle: '#9B9890' },
  light: { eyebrow: '#6E6A5C', title: '#111111', subtitle: '#6E6A5C' },
} as const;

function SectionHeading({ eyebrow, title, subtitle, theme = 'dark' }: { eyebrow: string; title: string; subtitle?: string; theme?: 'dark' | 'light' }) {
  const c = SECTION_THEME[theme];
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ fontSize: '11.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: c.eyebrow, marginBottom: '10px' }}>
        {eyebrow}
      </div>
      <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, letterSpacing: '-0.02em', color: c.title, margin: 0 }}>
        {title}
      </h2>
      {subtitle && <p style={{ fontSize: '14px', color: c.subtitle, marginTop: '10px', maxWidth: '620px' }}>{subtitle}</p>}
    </div>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
      {children}
    </div>
  );
}

/** Full-bleed section band (dark or light), matching the homepage's band/board rhythm — its own background, an inner max-width wrapper for content. */
function Band({ theme, children }: { theme: 'dark' | 'light'; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: theme === 'light' ? '#F1F2F4' : undefined, color: theme === 'light' ? '#111111' : undefined }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '56px 24px' }}>{children}</div>
    </div>
  );
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: report } = await supabase
    .from('brand_reports')
    .select('brand_name, brand_handle, category, mode, competitor_names')
    .eq('slug', slug)
    .maybeSingle();

  if (!report) notFound();

  const admin = createSupabaseAdminClient();
  const stats = await getPublicStats();

  const resolved = await resolveCanonicalBrand(admin, { brandHandle: report.brand_handle, brandName: report.brand_name });
  const tier1 = resolved ? await getBrandActivity(admin, resolved.canonicalName) : null;

  let competitors: BrandActivity[] = [];
  if (report.competitor_names) {
    // Defensive slice: admin UI caps at 3, but never trust stale data over the spec's "up to 3" limit.
    competitors = (await getCompetitorActivities(admin, report.competitor_names)).slice(0, 3);
  } else if (resolved) {
    competitors = await suggestCompetitors(admin, { excludeCanonicalName: resolved.canonicalName, category: resolved.category });
  }

  // allCreatorIds (every detected creator), not the engagement-scoreable-only `creators` list —
  // a competitor creator with too little post history to score still must not slip into Tier 3.
  const excludeCreatorIds = new Set(competitors.flatMap((c) => c.allCreatorIds));
  const matched = await getMatchedCreators(supabase, {
    mode: report.mode,
    brandHandle: report.brand_handle,
    category: report.category,
    excludeCreatorIds,
    limit: 10,
  });

  const topMatches = matched.slice(0, 3);
  const blurredMatches = matched.slice(3, 10);

  const signupUrl = '/signup?role=brand';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#F2F0EA', fontFamily: 'system-ui, sans-serif' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #262626' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#F2F0EA', letterSpacing: '-0.02em' }}>
              Influence<span style={{ color: '#FFD700' }}>IT</span>
            </span>
          </Link>
          <a
            href={signupUrl}
            style={{ fontSize: '13px', fontWeight: 700, padding: '10px 20px', borderRadius: '10px', backgroundColor: '#FFD700', color: '#111', textDecoration: 'none' }}
          >
            Sign up free
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: '64px 24px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '6px 14px', borderRadius: '999px', border: '1px solid #FFD700' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FFD700', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#FFD700' }}>Personalised creator report</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 14px' }}>
            Creator intelligence for <span style={{ color: '#FFD700' }}>{report.brand_name}</span>
          </h1>
          <p style={{ fontSize: '16px', color: '#9B9890', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
            Built live from InfluenceIT&apos;s index of {stats.creators.toLocaleString()}+ creators — real detected
            brand deals, real engagement, no guesswork.
          </p>
        </div>
      </div>

      {/* Tier 1 — Your creator activity (dark, continues the hero) */}
      {tier1 && (
        <Band theme="dark">
          <section>
            <SectionHeading
              theme="dark"
              eyebrow="Tier 1 · Open"
              title="Your creator activity"
              subtitle={`Creators we've detected posting sponsored content for ${resolved!.canonicalName}.`}
            />
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: '#FFD700', borderRadius: '16px', padding: '24px 28px', marginBottom: '28px' }}>
              <div style={{ flex: '1 1 160px' }}><StatBlock label="Sponsored posts" value={tier1.sponsoredPosts.toLocaleString()} /></div>
              <div style={{ flex: '1 1 160px' }}><StatBlock label="Distinct creators" value={tier1.distinctCreators.toLocaleString()} /></div>
              <div style={{ flex: '1 1 160px' }}><StatBlock label="Median engagement" value={formatEngagementRate(tier1.medianEngagement)} /></div>
              <div style={{ flex: '1 1 160px' }}><StatBlock label="Most recent post" value={formatDate(tier1.mostRecentPost)} /></div>
            </div>
            <CardGrid>
              {tier1.creators.slice(0, 6).map((c) => (
                <NamedCreatorCard
                  key={c.creatorId}
                  theme="dark"
                  creator={{ handle: c.handle, displayName: c.displayName, platform: c.platform, followerCount: c.followerCount, engagementRate: c.engagementRate }}
                />
              ))}
            </CardGrid>
          </section>
        </Band>
      )}

      {/* Tier 2 + Tier 3 — light section, same paper tone as the homepage leaderboard */}
      <Band theme="light">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '64px' }}>
          {competitors.length > 0 && (
            <section>
              <SectionHeading
                theme="light"
                eyebrow="Tier 2 · Open"
                title="Your competitive landscape"
                subtitle="Verified competitor brands in your category, and the creators actively posting sponsored content for them."
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {competitors.map((comp) => (
                  <div key={comp.canonicalName} style={{ background: '#FFFFFF', border: '1px solid #E4E0D4', borderRadius: '18px', padding: '22px', boxShadow: '0 2px 24px rgba(20,18,10,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#111111', margin: 0 }}>{comp.canonicalName}</h3>
                      <div style={{ fontSize: '12.5px', color: '#6E6A5C' }}>
                        {comp.distinctCreators.toLocaleString()} creators detected · most recent post {formatDate(comp.mostRecentPost)}
                      </div>
                    </div>
                    <CardGrid>
                      {comp.creators.slice(0, 3).map((c) => (
                        <NamedCreatorCard
                          key={c.creatorId}
                          theme="light"
                          creator={{ handle: c.handle, displayName: c.displayName, platform: c.platform, followerCount: c.followerCount, engagementRate: c.engagementRate }}
                        />
                      ))}
                    </CardGrid>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeading
              theme="light"
              eyebrow="Tier 3 · Partial"
              title="Recommended for you"
              subtitle="Creators matched to your brand's niche and partnership history — none currently work with the competitors above."
            />
            {competitors.length > 0 && (
              <p style={{ fontSize: '13px', color: '#6E6A5C', margin: '-14px 0 24px' }}>
                None of these creators currently post sponsored content for {competitors.map((c) => c.canonicalName).join(', ')}.
              </p>
            )}

            {matched.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#6E6A5C' }}>
                <p style={{ fontSize: '15px' }}>No creator matches found for this report yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {topMatches.length > 0 && (
                  <CardGrid>
                    {topMatches.map((m) => (
                      <NamedCreatorCard
                        key={m.creatorId}
                        theme="light"
                        href={`/login?redirectTo=${encodeURIComponent(`/creators/${m.handle}`)}`}
                        creator={{
                          handle: m.handle,
                          displayName: m.displayName,
                          platform: m.platform,
                          followerCount: m.followerCount,
                          engagementRate: m.engagementRate,
                        }}
                      />
                    ))}
                  </CardGrid>
                )}
                {blurredMatches.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {blurredMatches.map((m, i) => (
                      <CreatorCard key={i} creator={m.safe} signupUrl={signupUrl} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </Band>

      {/* CTA — back to dark */}
      <Band theme="dark">
        <div style={{ borderRadius: '24px', padding: '48px 32px', textAlign: 'center', background: 'linear-gradient(135deg, #141414 0%, #0A0A0A 100%)', border: '1px solid #262626', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: '#FFD700', opacity: 0.12, filter: 'blur(40px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: '#F2F0EA', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Want full profiles,<br />contact details &amp; more matches?
            </h2>
            <p style={{ color: '#9B9890', fontSize: '15px', maxWidth: '420px', margin: '0 auto 32px', lineHeight: 1.6 }}>
              Sign up free to unlock every creator&apos;s full stats, contact details,
              and start building partnerships today.
            </p>
            <a
              href={signupUrl}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', borderRadius: '14px', backgroundColor: '#FFD700', color: '#111', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}
            >
              Sign up free →
            </a>
            <p style={{ color: '#6E6A5C', fontSize: '12px', marginTop: '16px' }}>
              No credit card required · Free forever plan available
            </p>
          </div>
        </div>
      </Band>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '32px 24px', fontSize: '12px', color: '#6E6A5C', borderTop: '1px solid #262626' }}>
        Powered by{' '}
        <Link href="/" style={{ color: '#FFD700', fontWeight: 600, textDecoration: 'none' }}>InfluenceIT</Link>
        {' '}— {stats.creators.toLocaleString()}+ creators indexed with real engagement data.
      </footer>
    </div>
  );
}

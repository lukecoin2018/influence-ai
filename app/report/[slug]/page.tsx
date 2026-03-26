// app/report/[slug]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { toSafeCreator, type SafeCreator } from '@/lib/discover/config';
import CreatorCard from '@/app/discover/_components/CreatorCard';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Intentionally excludes handle columns — brands cannot identify creators without signing up
const BASE_SELECT =
  'creator_id, display_name:creators!inner(display_name), platform, follower_count, detected_city, detected_country, ai_summary, engagement_rate';

async function fetchAutoMatch(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  brandHandle: string,
  fallbackCategory: string | null,
): Promise<SafeCreator[]> {
  const { data: partners } = await supabase
    .from('social_profiles')
    .select('creator_id, ai_summary')
    .ilike('enrichment_data::text', `%"${brandHandle}"%`)
    .limit(50);

  if (!partners || partners.length === 0) {
    if (fallbackCategory) return fetchManualMatch(supabase, fallbackCategory);
    return [];
  }

  const tagCandidates = [
    'Beauty', 'Fashion', 'Fitness', 'Lifestyle', 'Travel',
    'Food', 'Wellness', 'Skincare', 'Gaming', 'Tech',
    'Nutrition', 'Comedy', 'Parenting',
  ];
  const counts: Record<string, number> = {};
  for (const p of partners) {
    const summary = (p.ai_summary || '').toLowerCase();
    for (const tag of tagCandidates) {
      if (summary.includes(tag.toLowerCase())) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
  }
  const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!topCategory) return fetchManualMatch(supabase, fallbackCategory ?? 'Lifestyle');

  const partnerIds = partners.map((p: { creator_id: string }) => p.creator_id);

  const { data: rawCreators } = await supabase
    .from('social_profiles')
    .select(BASE_SELECT)
    .ilike('ai_summary', `%${topCategory}%`)
    .not('creator_id', 'in', `(${partnerIds.join(',')})`)
    .gte('follower_count', 50_000)
    .lte('follower_count', 500_000)
    .order('engagement_rate', { ascending: false })
    .limit(10);

  return (rawCreators ?? []).map(toSafeCreator);
}

async function fetchManualMatch(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  category: string,
): Promise<SafeCreator[]> {
  const { data: rawCreators } = await supabase
    .from('social_profiles')
    .select(BASE_SELECT)
    .ilike('ai_summary', `%${category}%`)
    .gte('follower_count', 50_000)
    .lte('follower_count', 500_000)
    .order('engagement_rate', { ascending: false })
    .limit(10);

  return (rawCreators ?? []).map(toSafeCreator);
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
    .select('brand_name, brand_handle, category, mode')
    .eq('slug', slug)
    .single();

  if (!report) notFound();

  let creators: SafeCreator[] = [];
  if (report.mode === 'auto' && report.brand_handle) {
    creators = await fetchAutoMatch(supabase, report.brand_handle, report.category);
  } else if (report.category) {
    creators = await fetchManualMatch(supabase, report.category);
  }

  const signupUrl = '/signup?role=brand';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB' }}>

      {/* Minimal nav */}
      <nav style={{ backgroundColor: 'white', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#3A3A3A', letterSpacing: '-0.02em' }}>
              Influence<span style={{ color: '#FFD700' }}>IT</span>
            </span>
          </a>
          <a
            href={signupUrl}
            style={{ fontSize: '13px', fontWeight: 600, padding: '8px 18px', borderRadius: '10px', backgroundColor: '#FFD700', color: '#3A3A3A', textDecoration: 'none' }}
          >
            Sign up free
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(160deg, #fff 0%, #fffbea 60%, #fff0f7 100%)', padding: '56px 24px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '6px 14px', borderRadius: '999px', border: '1px solid #FFD700', backgroundColor: 'rgba(255,215,0,0.08)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FFD700', boxShadow: '0 0 0 3px rgba(255,215,0,0.25)', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#B8860B' }}>Personalised creator report</span>
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, color: '#3A3A3A', letterSpacing: '-0.02em', lineHeight: 1.2, margin: '0 0 12px' }}>
            {creators.length} Creators Matched for{' '}
            <span style={{ background: 'linear-gradient(90deg, #D4820A, #FF4D94)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {report.brand_name}
            </span>
          </h1>
          <p style={{ fontSize: '16px', color: '#6B7280', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
            We analysed our database of 2,700+ verified creators and found these matches
            based on your brand&apos;s niche and partnership history.
          </p>
        </div>
      </div>

      {/* Creator grid */}
      <main style={{ maxWidth: '1024px', margin: '0 auto', padding: '40px 24px' }}>
        {creators.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF' }}>
            <p style={{ fontSize: '16px' }}>No creators found for this report.</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Please contact InfluenceIT to update this report.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {creators.map((creator, i) => (
              <CreatorCard key={i} creator={creator} signupUrl={signupUrl} />
            ))}
          </div>
        )}

        {/* CTA block */}
        <div style={{ marginTop: '56px', borderRadius: '24px', padding: '48px 32px', textAlign: 'center', background: 'linear-gradient(135deg, #3A3A3A 0%, #1a1a1a 100%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: '#FFD700', opacity: 0.15, filter: 'blur(40px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: '#FF4D94', opacity: 0.15, filter: 'blur(40px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: 'white', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Want to see full profiles,<br />engagement data &amp; connect?
            </h2>
            <p style={{ color: '#9CA3AF', fontSize: '15px', maxWidth: '420px', margin: '0 auto 32px', lineHeight: 1.6 }}>
              Sign up free to unlock every creator&apos;s full stats, contact details,
              and start building partnerships today.
            </p>
            <a
              href={signupUrl}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', borderRadius: '14px', backgroundColor: '#FFD700', color: '#3A3A3A', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}
            >
              Sign up free →
            </a>
            <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '16px' }}>
              No credit card required · Free forever plan available
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '32px 24px', fontSize: '12px', color: '#9CA3AF' }}>
        Powered by{' '}
        <a href="/" style={{ color: '#D4820A', fontWeight: 600, textDecoration: 'none' }}>InfluenceIT</a>
        {' '}— AI-powered creator discovery
      </footer>
    </div>
  );
}

import type { Metadata } from 'next';
import './home.css';
import { getPublicStats, getTopCreators, getFeaturedCreatorPool, getRenderTimestamp } from './_queries';
import { withTimeout } from '@/lib/withTimeout';
import { buildOnlyFallback } from '@/lib/buildOnlyFallback';
import type { PublicStats } from './_data';
import { Ticker } from './_components/Ticker';
import { Nav } from './_components/Nav';
import { Hero } from './_components/Hero';
import { StatsBand } from './_components/StatsBand';
import { Leaderboard } from './_components/Leaderboard';
import { Methodology } from './_components/Methodology';
import { Cta } from './_components/Cta';
import { CreatorStrip } from './_components/CreatorStrip';
import { Footer } from './_components/Footer';

export const revalidate = 3600;

// 30 s, up from 10 s (2026-09-16). It is a JS ceiling only: Postgres cancels
// each public_stats() call at 8 s first (authenticator's statement_timeout,
// which service-role API calls inherit), and getPublicStats() retries that up
// to three times (~25 s worst case), which this has to leave room for. The
// function body is in supabase/migrations/0027_creator_exclusion.sql; on a
// cold database it runs past 8 s (measured 2026-10-06: 8.2 s cancelled twice,
// then 4.1 s, then 0.56 s).
const STATS_TIMEOUT_MS = 30_000;

// Used only when a call fails during `next build` (see buildOnlyFallback):
// this route is prerendered at build time, and a slow public_stats() must
// never fail a deploy. After that, a failed revalidation keeps the last good
// page instead. Same values as app/opengraph-image.tsx's FALLBACK_STATS —
// public_stats() as of 2026-10-06, after phase 2 hid 993 non-creator
// accounts. They go stale as the index grows; update both together.
const FALLBACK_STATS: PublicStats = {
  creators: 7649,
  postsAnalyzed: 217797,
  brandDeals: 18453,
  igMedian: 1.3,
  tiktokMedian: 1.3,
  lastIndex: 'Sep 22, 2026',
};

export async function generateMetadata(): Promise<Metadata> {
  const stats = await withTimeout(getPublicStats(), STATS_TIMEOUT_MS).catch(
    buildOnlyFallback('getPublicStats (metadata)', FALLBACK_STATS)
  );
  const title = `InfluenceIT — ${stats.creators.toLocaleString()}+ creators. Zero guesswork.`;
  const description = `InfluenceIT indexes real engagement, content mix, and detected brand deals across Instagram and TikTok — browse ${stats.creators.toLocaleString()} creators ranked by real data, not follower counts.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: 'https://influenceit.app',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: 'https://influenceit.app',
    },
  };
}

// Every data call falls back only during `next build`; during a revalidation a
// failure rethrows, so Next keeps serving the last good page and retries on the
// next request rather than caching an empty leaderboard or fallback figures for
// an hour (lib/buildOnlyFallback.ts).
export default async function HomePage() {
  const stats = await withTimeout(getPublicStats(), STATS_TIMEOUT_MS).catch(
    buildOnlyFallback('getPublicStats', FALLBACK_STATS)
  );
  const [instagram, tiktok] = await Promise.all([
    withTimeout(getTopCreators('instagram', 10), STATS_TIMEOUT_MS).catch(
      buildOnlyFallback('getTopCreators(instagram)', [])
    ),
    withTimeout(getTopCreators('tiktok', 10), STATS_TIMEOUT_MS).catch(
      buildOnlyFallback('getTopCreators(tiktok)', [])
    ),
  ]);
  const pool = await withTimeout(getFeaturedCreatorPool(instagram, stats), STATS_TIMEOUT_MS).catch(
    buildOnlyFallback('getFeaturedCreatorPool', [])
  );
  // Captured once here and passed down as a prop — the pool index must be derived
  // from this single value, not a fresh Date.now() independently on server/client.
  const now = getRenderTimestamp();

  return (
    <div className="hv2">
      <Ticker instagram={instagram} tiktok={tiktok} />
      <Nav />
      <Hero stats={stats} pool={pool} now={now} />
      <StatsBand stats={stats} />
      <Leaderboard instagram={instagram} tiktok={tiktok} totalCreators={stats.creators} />
      <Methodology lastIndexRun={stats.lastIndex} />
      <Cta totalCreators={stats.creators} />
      <CreatorStrip />
      <Footer />
    </div>
  );
}

import type { Metadata } from 'next';
import './home.css';
import { getPublicStats, getTopCreators, getFeaturedCreatorPool, getRenderTimestamp } from './_queries';
import { withTimeout } from '@/lib/withTimeout';
import type { PublicStats } from './_data';
import { Ticker } from './_components/Ticker';
import { Nav } from './_components/Nav';
import { Hero } from './_components/Hero';
import { StatsBand } from './_components/StatsBand';
import { Leaderboard } from './_components/Leaderboard';
import { Methodology } from './_components/Methodology';
import { Cta } from './_components/Cta';
import { Footer } from './_components/Footer';

export const revalidate = 3600;

const STATS_TIMEOUT_MS = 10_000;

// Same rationale and same last-known-good snapshot as app/opengraph-image.tsx's
// FALLBACK_STATS: this route is statically prerendered at build time too, and a
// slow/timed-out public_stats() RPC must never be able to fail `next build`.
// Values mirrored from opengraph-image.tsx for consistency — stale (dated
// Jul 3, 2026), refresh both together when a real snapshot is next available.
const FALLBACK_STATS: PublicStats = {
  creators: 5112,
  postsAnalyzed: 69451,
  brandDeals: 3798,
  igMedian: 0.6,
  tiktokMedian: 0.4,
  lastIndex: 'Jul 3, 2026',
};

export async function generateMetadata(): Promise<Metadata> {
  const stats = await withTimeout(getPublicStats(), STATS_TIMEOUT_MS).catch(() => FALLBACK_STATS);
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

export default async function HomePage() {
  const stats = await withTimeout(getPublicStats(), STATS_TIMEOUT_MS).catch(() => FALLBACK_STATS);
  const [instagram, tiktok] = await Promise.all([
    withTimeout(getTopCreators('instagram', 10), STATS_TIMEOUT_MS).catch(() => []),
    withTimeout(getTopCreators('tiktok', 10), STATS_TIMEOUT_MS).catch(() => []),
  ]);
  const pool = await withTimeout(getFeaturedCreatorPool(instagram, stats), STATS_TIMEOUT_MS).catch(() => []);
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
      <Footer />
    </div>
  );
}

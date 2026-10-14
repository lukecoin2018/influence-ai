import type { Metadata } from 'next';
import './home.css';
import { getPublicStats, getTopCreators, getFeaturedCreatorPool, getRenderTimestamp } from './_queries';
import { Ticker } from './_components/Ticker';
import { Nav } from './_components/Nav';
import { Hero } from './_components/Hero';
import { StatsBand } from './_components/StatsBand';
import { Leaderboard } from './_components/Leaderboard';
import { Methodology } from './_components/Methodology';
import { Cta } from './_components/Cta';
import { CreatorStrip } from './_components/CreatorStrip';
import { Footer } from './_components/Footer';

/**
 * 300 s, down from 3600 (2026-10-14). Every figure on this page comes from
 * one precomputed row (homepage_snapshot, migration 0031), so a regeneration
 * is a single primary-key read and costs nothing worth rationing. The short
 * window is what makes a new snapshot visible quickly on the VPS, where nginx
 * keeps its own copy of `/` for as long as this page's s-maxage allows:
 * /api/revalidate-home refreshes Next's copy, and nginx's expires within
 * 5 minutes on its own.
 *
 * No fallback figures and no timeouts. If the snapshot cannot be read, the
 * helpers in ./_queries throw: at runtime Next keeps serving the last good
 * page, and at build time the build fails, on purpose. The hardcoded
 * "5,112 creators · Jul 3, 2026" fallback that used to live here was rendered
 * and cached for an hour every time a render-time query was slow.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getPublicStats();
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
  const [stats, instagram, tiktok, pool] = await Promise.all([
    getPublicStats(),
    getTopCreators('instagram'),
    getTopCreators('tiktok'),
    getFeaturedCreatorPool(),
  ]);
  // Captured once here and passed down as a prop — the pool index must be derived
  // from this single value, not a fresh Date.now() independently on server/client.
  const now = getRenderTimestamp();
  const hasBoard = instagram.length > 0 || tiktok.length > 0;

  return (
    <div className="hv2">
      {hasBoard && <Ticker instagram={instagram} tiktok={tiktok} />}
      <Nav />
      <Hero stats={stats} pool={pool} now={now} />
      <StatsBand stats={stats} />
      {hasBoard && <Leaderboard instagram={instagram} tiktok={tiktok} totalCreators={stats.creators} />}
      <Methodology lastIndexRun={stats.lastIndex} />
      <Cta totalCreators={stats.creators} />
      <CreatorStrip />
      <Footer />
    </div>
  );
}

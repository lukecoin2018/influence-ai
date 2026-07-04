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
import { Footer } from './_components/Footer';

export const revalidate = 3600;

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
  const stats = await getPublicStats();
  const [instagram, tiktok] = await Promise.all([
    getTopCreators('instagram', 10),
    getTopCreators('tiktok', 10),
  ]);
  const pool = await getFeaturedCreatorPool(instagram, stats);
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

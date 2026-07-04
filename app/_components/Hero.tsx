import type { PublicStats, FeaturedCreator } from '../_data';
import { HeroCard } from './HeroCard';

export function Hero({ stats, pool, now }: { stats: PublicStats; pool: FeaturedCreator[]; now: number }) {
  return (
    <header className="hero">
      <div className={`wrap hero-grid${pool.length > 0 ? '' : ' solo'}`}>
        <div>
          <div className="eyebrow">Creator intelligence database</div>
          <h1>
            <span className="h1-line">{stats.creators.toLocaleString()} creators.</span>
            <span className="h1-line yl">Zero guesswork.</span>
          </h1>
          <p className="lede">
            InfluenceIT indexes real engagement, content mix, and detected brand deals across Instagram and
            TikTok — so your shortlist is built on evidence, not follower counts.
          </p>
          <div className="hero-ctas">
            <a className="btn btn-yellow" href="#board">See the leaderboard</a>
            <a className="btn btn-ghost-d" href="#method">How the numbers work</a>
          </div>
          <div className="hero-note">
            <span className="hero-note-text">
              Index updated {stats.lastIndex} · every stat on this page is read from the live database
            </span>
          </div>
        </div>

        {pool.length > 0 && <HeroCard pool={pool} now={now} />}
      </div>
    </header>
  );
}

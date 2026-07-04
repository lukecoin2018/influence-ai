import type { PublicStats } from '../_data';

export function StatsBand({ stats }: { stats: PublicStats }) {
  return (
    <section className="band" aria-label="Index statistics">
      <div className="wrap band-in">
        <div className="band-stat"><b>{stats.creators.toLocaleString()}</b><span>creators indexed</span></div>
        <div className="band-stat band-stat-wide">
          <b>IG {stats.igMedian.toFixed(1)}% · TikTok {stats.tiktokMedian.toFixed(1)}%</b><span>median engagement</span>
        </div>
        <div className="band-stat"><b>{stats.brandDeals.toLocaleString()}</b><span>brand deals detected</span></div>
        <div className="band-stat"><b>{stats.postsAnalyzed.toLocaleString()}</b><span>posts analyzed</span></div>
        <div className="band-stat"><b>{stats.lastIndex}</b><span>last index run</span></div>
      </div>
    </section>
  );
}

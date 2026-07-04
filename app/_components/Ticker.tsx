import { formatCount } from '@/lib/formatters';
import type { LeaderboardRow } from '../_data';

type TickerEntry = { key: string; handle: string; label: string };

// Instagram and TikTok top_creators results, interleaved. All entries show ▲ —
// there's no history yet to compute real direction from (a snapshots table is
// accumulating for a later pass), so we don't fabricate up/down deltas.
function buildEntries(instagram: LeaderboardRow[], tiktok: LeaderboardRow[]): TickerEntry[] {
  const entries: TickerEntry[] = [];
  const max = Math.max(instagram.length, tiktok.length);
  for (let i = 0; i < max; i++) {
    if (instagram[i]) {
      const r = instagram[i];
      entries.push({ key: `ig-${r.handle}`, handle: r.handle, label: `▲ ${r.engagement.toFixed(1)}%` });
    }
    if (tiktok[i]) {
      const r = tiktok[i];
      entries.push({ key: `tt-${r.handle}`, handle: r.handle, label: `▲ ${formatCount(r.medViews)} views` });
    }
  }
  return entries;
}

function tickItem(entry: TickerEntry, keyPrefix: string) {
  return (
    <span className="tick-item" key={`${keyPrefix}-${entry.key}`}>
      @{entry.handle} <b>{entry.label}</b>
    </span>
  );
}

export function Ticker({ instagram, tiktok }: { instagram: LeaderboardRow[]; tiktok: LeaderboardRow[] }) {
  const entries = buildEntries(instagram, tiktok);
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {entries.map((e) => tickItem(e, 'a'))}
        {entries.map((e) => tickItem(e, 'b'))}
      </div>
    </div>
  );
}

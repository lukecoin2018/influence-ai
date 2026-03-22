// ─────────────────────────────────────────────────────────────
// app/discover/_components/StatsBar.tsx
// ─────────────────────────────────────────────────────────────

interface StatsBarProps {
  totalCreators: number;
  avgEngagement: string | null;
  platform: string;
  category: string;
}

export default function StatsBar({
  totalCreators,
  avgEngagement,
  platform,
  category,
}: StatsBarProps) {
  const stats = [
    {
      value: `${totalCreators}+`,
      label: `${category} creators in our database`,
      icon: '👥',
    },
    {
      value: avgEngagement ? `${avgEngagement}%` : '4–8%',
      label: 'Average engagement rate in this niche',
      icon: '📈',
    },
    {
      value: 'Verified',
      label: `Real ${platform === 'instagram' ? 'Instagram' : 'TikTok'} accounts with authentic data`,
      icon: '✅',
    },
    {
      value: '50K–500K',
      label: 'Follower range — the brand partnership sweet spot',
      icon: '🎯',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 rounded-2xl overflow-hidden border border-gray-200">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-white px-5 py-4 flex flex-col gap-1"
        >
          <span className="text-lg">{stat.icon}</span>
          <span className="text-xl font-bold text-[#3A3A3A] leading-tight">
            {stat.value}
          </span>
          <span className="text-xs text-gray-500 leading-snug">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

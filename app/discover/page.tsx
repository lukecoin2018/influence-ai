// ─────────────────────────────────────────────────────────────
// app/discover/page.tsx  — /discover index
// ─────────────────────────────────────────────────────────────
import { Metadata } from 'next';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { DISCOVER_PAGES, type Platform } from '@/lib/discover/config';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Discover Influencers by Niche (2026) | InfluenceIT',
  description:
    "Browse InfluenceIT's curated database of 2,200+ verified Instagram and TikTok creators across 54 categories. Find authentic brand partners with real engagement data.",
  alternates: { canonical: 'https://influenceit.app/discover' },
  openGraph: {
    title: 'Discover Influencers by Niche | InfluenceIT',
    description: 'Browse verified Instagram and TikTok creators across 54 niches with real engagement data.',
    url: 'https://influenceit.app/discover',
    siteName: 'InfluenceIT',
    type: 'website',
  },
};

function groupByCategory(): {
  category: string;
  emoji: string;
  pages: { slug: string; platform: Platform; label: string }[];
}[] {
  const map = new Map<
    string,
    { emoji: string; pages: { slug: string; platform: Platform; label: string }[] }
  >();

  for (const [slug, cfg] of Object.entries(DISCOVER_PAGES)) {
    if (!map.has(cfg.category)) {
      map.set(cfg.category, { emoji: cfg.emoji, pages: [] });
    }
    map.get(cfg.category)!.pages.push({ slug, platform: cfg.platform, label: cfg.label });
  }

  return Array.from(map.entries())
    .map(([category, { emoji, pages }]) => ({ category, emoji, pages }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

function InstagramBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="ig-idx" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-idx)" />
        <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
        <circle cx="17.2" cy="6.8" r="1.2" fill="white" />
      </svg>
      Instagram
    </span>
  );
}

function TikTokBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="5" fill="#010101" />
        <path
          d="M16.5 5.5C17.1 6.3 18 6.8 19 6.9V9.4C18 9.3 17.1 9 16.3 8.5V13.5C16.3 16.0 14.2 18 11.7 18C9.2 18 7.1 16.0 7.1 13.5C7.1 11.0 9.2 9.0 11.7 9.0C11.9 9.0 12.1 9.0 12.3 9.0V11.6C12.1 11.5 11.9 11.5 11.7 11.5C10.5 11.5 9.6 12.4 9.6 13.5C9.6 14.6 10.5 15.5 11.7 15.5C12.9 15.5 13.8 14.6 13.8 13.5V5.5H16.5Z"
          fill="white"
        />
      </svg>
      TikTok
    </span>
  );
}

export default async function DiscoverIndexPage() {
  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from('social_profiles')
    .select('*', { count: 'exact', head: true })
    .gte('follower_count', 50_000)
    .lte('follower_count', 500_000);

  const totalCreators = count ?? 2200;
  const groups = groupByCategory();
  const totalPages = Object.keys(DISCOVER_PAGES).length;

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-[#fafafa] to-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14">
          <div className="w-8 h-1 bg-[#FFD700] rounded-full mb-6" />

          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#3A3A3A] leading-tight max-w-2xl">
            Discover Influencers{' '}
            <span style={{ color: '#FF4D94' }}>
  by Niche
</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-xl leading-relaxed">
            Browse our curated database of{' '}
            <strong className="text-[#3A3A3A]">{totalCreators.toLocaleString()}+ verified</strong>{' '}
            Instagram and TikTok creators across {totalPages} niche categories — all with real
            engagement data.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { icon: '📊', text: `${totalCreators.toLocaleString()}+ creators` },
              { icon: '✅', text: 'All verified accounts' },
              { icon: '📸', text: 'Instagram & TikTok' },
              { icon: '🎯', text: '50K–500K sweet spot' },
            ].map((pill) => (
              <span
                key={pill.text}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-sm text-gray-600 font-medium"
              >
                {pill.icon} {pill.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category Grid ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.category}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-4">
  <h2 className="text-lg font-bold text-[#3A3A3A]">{group.category}</h2>
</div>

              <div className="space-y-2">
                {group.pages.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/discover/${page.slug}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      {page.platform === 'instagram' ? <InstagramBadge /> : <TikTokBadge />}
                      <span className="text-sm text-gray-700 font-medium">{page.label} Creators</span>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-300 group-hover:text-[#FFD700] transition-colors"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Bottom CTA ────────────────────────────────── */}
        <div className="mt-16 rounded-2xl bg-gradient-to-br from-[#3A3A3A] to-[#1a1a1a] px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#FFD700] rounded-b-full" />
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center top, #FFD700 0%, transparent 70%)' }}
          />
          <div className="relative z-10">
            <p className="text-2xl font-extrabold text-white">
              See the full profile behind every creator
            </p>
            <p className="mt-2 text-gray-300 text-base max-w-lg mx-auto">
              Engagement rates, analytics, posting frequency, hashtags, and direct contact — all in
              one platform.
            </p>
            <a
              href="/signup"
              className="mt-8 inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#FFD700] text-[#3A3A3A] rounded-xl font-bold text-base hover:brightness-105 transition-all"
            >
              Get Started Free
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

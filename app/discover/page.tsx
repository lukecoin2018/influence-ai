// ─────────────────────────────────────────────────────────────
// app/discover/page.tsx  — /discover index
// Sections: By Niche, By Location, By Creator Size, For Your Brand
// ─────────────────────────────────────────────────────────────
import { Metadata } from 'next';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  DISCOVER_PAGES,
  LOCATION_PAGES,
  TIER_PAGES,
  USE_CASE_PAGES,
  FOLLOWER_TIERS,
  type Platform,
} from '@/lib/discover/config';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Discover Influencers by Niche, Location & Size (2026) | InfluenceIT',
  description:
    "Browse InfluenceIT's curated database of 2,200+ verified Instagram and TikTok creators. Filter by niche, location, follower size, or brand use case — all with real engagement data.",
  alternates: { canonical: 'https://influenceit.app/discover' },
  openGraph: {
    title: 'Discover Influencers by Niche, Location & Size | InfluenceIT',
    description: 'Browse verified Instagram and TikTok creators across niches, locations, follower tiers, and brand use cases with real engagement data.',
    url: 'https://influenceit.app/discover',
    siteName: 'InfluenceIT',
    type: 'website',
  },
};

function groupNichesByCategory() {
  const map = new Map<string, { emoji: string; pages: { slug: string; platform: Platform; label: string }[] }>();
  for (const [slug, cfg] of Object.entries(DISCOVER_PAGES)) {
    if (!map.has(cfg.category)) map.set(cfg.category, { emoji: cfg.emoji, pages: [] });
    map.get(cfg.category)!.pages.push({ slug, platform: cfg.platform, label: cfg.label });
  }
  return Array.from(map.entries())
    .map(([category, { emoji, pages }]) => ({ category, emoji, pages }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

function groupLocationsByPlace() {
  const map = new Map<string, { emoji: string; instagram?: { slug: string }; tiktok?: { slug: string } }>();
  for (const [slug, cfg] of Object.entries(LOCATION_PAGES)) {
    const key = cfg.locationLabel;
    if (!map.has(key)) map.set(key, { emoji: cfg.emoji });
    const entry = map.get(key)!;
    if (cfg.platform === 'instagram') entry.instagram = { slug };
    else if (cfg.platform === 'tiktok') entry.tiktok = { slug };
    else entry.instagram = { slug };
  }
  return Array.from(map.entries()).map(([locationLabel, data]) => ({ locationLabel, emoji: data.emoji, instagram: data.instagram, tiktok: data.tiktok }));
}

function InstagramBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full flex-shrink-0">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
        <defs><linearGradient id="ig-idx3" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433" /><stop offset="100%" stopColor="#bc1888" /></linearGradient></defs>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-idx3)" />
        <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
        <circle cx="17.2" cy="6.8" r="1.2" fill="white" />
      </svg>
      Instagram
    </span>
  );
}

function TikTokBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="5" fill="#010101" />
        <path d="M16.5 5.5C17.1 6.3 18 6.8 19 6.9V9.4C18 9.3 17.1 9 16.3 8.5V13.5C16.3 16.0 14.2 18 11.7 18C9.2 18 7.1 16.0 7.1 13.5C7.1 11.0 9.2 9.0 11.7 9.0C11.9 9.0 12.1 9.0 12.3 9.0V11.6C12.1 11.5 11.9 11.5 11.7 11.5C10.5 11.5 9.6 12.4 9.6 13.5C9.6 14.6 10.5 15.5 11.7 15.5C12.9 15.5 13.8 14.6 13.8 13.5V5.5H16.5Z" fill="white" />
      </svg>
      TikTok
    </span>
  );
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4 text-gray-300 group-hover:text-[#FFD700] transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-extrabold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

const CITY_LABELS = ['New York', 'Los Angeles', 'London', 'Miami', 'Dallas', 'Paris', 'Madrid', 'Dubai'];
const COUNTRY_LABELS = ['the United States', 'the United Kingdom', 'France', 'Germany', 'Spain', 'Canada', 'Brazil', 'Colombia', 'Mexico'];

export default async function DiscoverIndexPage() {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from('social_profiles')
    .select('*', { count: 'exact', head: true })
    .gte('follower_count', 50_000)
    .lte('follower_count', 500_000);

  const totalCreators = count ?? 2200;
  const nicheGroups = groupNichesByCategory();
  const locationGroups = groupLocationsByPlace();
  const tierEntries = Object.entries(TIER_PAGES);
  const useCaseEntries = Object.entries(USE_CASE_PAGES);

  const cityGroups = locationGroups.filter(g => CITY_LABELS.includes(g.locationLabel));
  const countryGroups = locationGroups.filter(g => COUNTRY_LABELS.includes(g.locationLabel));

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Discover Influencers by Niche, Location & Size | InfluenceIT',
    description: `Browse ${totalCreators.toLocaleString()}+ verified Instagram and TikTok creators across niches, locations, follower tiers, and brand use cases.`,
    url: 'https://influenceit.app/discover',
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://influenceit.app' },
        { '@type': 'ListItem', position: 2, name: 'Discover', item: 'https://influenceit.app/discover' },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14">
          <div className="w-8 h-1 bg-[#FFD700] rounded-full mb-6" />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight max-w-2xl">
            Discover Influencers{' '}
            <span style={{ color: '#FF4D94' }}>by Niche</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-xl leading-relaxed">
            Browse our curated database of{' '}
            <strong className="text-gray-900">{totalCreators.toLocaleString()}+ verified</strong>{' '}
            Instagram and TikTok creators — filter by niche, location, creator size, or brand use case.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { icon: '📊', text: `${totalCreators.toLocaleString()}+ creators` },
              { icon: '✅', text: 'All verified accounts' },
              { icon: '📸', text: 'Instagram & TikTok' },
              { icon: '🎯', text: '50K–500K sweet spot' },
            ].map((pill) => (
              <span key={pill.text} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-600 font-medium">
                {pill.icon} {pill.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

        {/* ── Section 1: By Niche ───────────────────────── */}
        <section>
          <SectionHeading title="Browse by Niche" subtitle="Find creators by their content category across Instagram and TikTok" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {nicheGroups.map((group) => (
              <div key={group.category} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{group.category}</h3>
                </div>
                <div className="space-y-2">
                  {group.pages.map((page) => (
                    <Link key={page.slug} href={`/discover/${page.slug}`} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-2">
                        {page.platform === 'instagram' ? <InstagramBadge /> : <TikTokBadge />}
                        <span className="text-sm text-gray-700 font-medium">{page.label} Creators</span>
                      </div>
                      <ChevronRight />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 2: By Location ────────────────────── */}
        <section>
          <SectionHeading title="Browse by Top Locations" subtitle="Most active creator hubs — we cover many more locations inside the platform" />

          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Most Active Cities</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
            {cityGroups.map(({ locationLabel, emoji, instagram, tiktok }) => (
              <div key={locationLabel} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{emoji}</span>
                  <h4 className="font-bold text-gray-900">{locationLabel}</h4>
                </div>
                <div className="space-y-2">
                  {instagram && (
                    <Link href={`/discover/${instagram.slug}`} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-2"><InstagramBadge /><span className="text-sm text-gray-700 font-medium">Instagram Creators</span></div>
                      <ChevronRight />
                    </Link>
                  )}
                  {tiktok && (
                    <Link href={`/discover/${tiktok.slug}`} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-2"><TikTokBadge /><span className="text-sm text-gray-700 font-medium">TikTok Creators</span></div>
                      <ChevronRight />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Most Active Countries</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {countryGroups.map(({ locationLabel, emoji, instagram, tiktok }) => (
              <div key={locationLabel} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{emoji}</span>
                  <h4 className="font-bold text-gray-900">{locationLabel.replace('the ', '')}</h4>
                </div>
                <div className="space-y-2">
                  {instagram && (
                    <Link href={`/discover/${instagram.slug}`} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-2"><InstagramBadge /><span className="text-sm text-gray-700 font-medium">Instagram Creators</span></div>
                      <ChevronRight />
                    </Link>
                  )}
                  {tiktok && (
                    <Link href={`/discover/${tiktok.slug}`} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-2"><TikTokBadge /><span className="text-sm text-gray-700 font-medium">TikTok Creators</span></div>
                      <ChevronRight />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 3: By Creator Size ────────────────── */}
        <section>
          <SectionHeading title="Browse by Creator Size" subtitle="Popular niche + size combinations — many more size filters available inside the platform" />
          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            {(Object.entries(FOLLOWER_TIERS) as [string, typeof FOLLOWER_TIERS[keyof typeof FOLLOWER_TIERS]][]).map(([key, tier]) => (
              <div key={key} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <p className="font-bold text-gray-900 text-base">{tier.label}</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: '#D4820A' }}>{tier.range} followers</p>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  {key === 'micro' && 'Highest engagement rates. Best for authentic conversions and niche audiences.'}
                  {key === 'mid-tier' && 'The sweet spot. Real reach with real engagement. Best overall ROI.'}
                  {key === 'top' && 'Maximum visibility. Best for brand awareness at scale.'}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {(Object.keys(FOLLOWER_TIERS) as Array<keyof typeof FOLLOWER_TIERS>).map((tierKey) => {
              const tier = FOLLOWER_TIERS[tierKey];
              const pages = tierEntries.filter(([, cfg]) => cfg.tier === tierKey);
              return (
                <div key={tierKey}>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{tier.label} · {tier.range}</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {pages.map(([slug, cfg]) => (
                      <Link key={slug} href={`/discover/${slug}`} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-[#FFD700] hover:bg-amber-50 transition-all group">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cfg.emoji}</span>
                          <span className="text-sm font-medium text-gray-700">{cfg.category} {tier.label}</span>
                        </div>
                        <ChevronRight />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 4: For Your Brand ─────────────────── */}
        <section>
          <SectionHeading title="Find Creators for Your Brand" subtitle="Browse by what your brand is trying to achieve — not just by niche" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCaseEntries.map(([slug, cfg]) => (
              <Link
                key={slug}
                href={`/discover/${slug}`}
                className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-gray-200 bg-white hover:border-[#FFD700] hover:bg-amber-50 transition-all group"
              >
                <span className="text-2xl flex-shrink-0">{cfg.emoji}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{cfg.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cfg.description.split('.')[0]}.</p>
                </div>
                <ChevronRight />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ────────────────────────────────── */}
        <div className="rounded-2xl bg-gray-900 px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#FFD700] rounded-b-full" />
          <div className="relative z-10">
            <p className="text-2xl font-extrabold text-white">See the full profile behind every creator</p>
            <p className="mt-2 text-gray-300 text-base max-w-lg mx-auto">
              Engagement rates, analytics, posting frequency, hashtags, and direct contact — all in one platform.
            </p>
            <a
              href="/auth/signup"
              className="mt-8 inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-base hover:brightness-95 transition-all"
              style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}
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

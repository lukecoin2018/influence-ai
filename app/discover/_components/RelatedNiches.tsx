// ─────────────────────────────────────────────────────────────
// app/discover/_components/RelatedNiches.tsx
// ─────────────────────────────────────────────────────────────
import Link from 'next/link';
import { DISCOVER_PAGES } from '@/lib/discover/config';

interface RelatedNichesProps {
  relatedSlugs: string[];
  currentSlug: string;
}

export default function RelatedNiches({ relatedSlugs, currentSlug }: RelatedNichesProps) {
  // Filter to slugs that actually exist in config
  const validSlugs = relatedSlugs.filter(
    (s) => s !== currentSlug && DISCOVER_PAGES[s],
  );

  // Pad with other pages if we have fewer than 4 valid related
  if (validSlugs.length < 4) {
    const allSlugs = Object.keys(DISCOVER_PAGES).filter(
      (s) => s !== currentSlug && !validSlugs.includes(s),
    );
    validSlugs.push(...allSlugs.slice(0, 4 - validSlugs.length));
  }

  const items = validSlugs.slice(0, 6).map((slug) => {
    const cfg = DISCOVER_PAGES[slug];
    return { slug, label: cfg.label, platform: cfg.platform, emoji: cfg.emoji };
  });

  if (items.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-xl font-bold text-[#3A3A3A] mb-4">Explore More Niches</h2>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/discover/${item.slug}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-[#FFD700] hover:bg-amber-50 transition-all text-sm font-medium text-[#3A3A3A] group"
          >
            <span>{item.emoji}</span>
            <span>
              <span className="capitalize">{item.platform === 'instagram' ? 'Instagram' : 'TikTok'}</span>{' '}
              {item.label}
            </span>
            <svg
              className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#3A3A3A] transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}

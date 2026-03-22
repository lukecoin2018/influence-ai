// ─────────────────────────────────────────────────────────────
// app/blog/page.tsx — /blog index
// ─────────────────────────────────────────────────────────────
import { Metadata } from 'next';
import Link from 'next/link';
import { BLOG_POSTS, formatDate } from '@/lib/blog/types';

export const metadata: Metadata = {
  title: 'Influencer Marketing Insights & Data | InfluenceIT Blog',
  description: 'Data-driven insights for brands working with Instagram and TikTok creators. Real engagement data from 2,200+ verified creators across 12 niches.',
  alternates: { canonical: 'https://influenceit.app/blog' },
  openGraph: {
    title: 'Influencer Marketing Insights & Data | InfluenceIT Blog',
    description: 'Data-driven insights for brands working with Instagram and TikTok creators.',
    url: 'https://influenceit.app/blog',
    siteName: 'InfluenceIT',
    type: 'website',
  },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Data & Insights': { bg: '#FFF3CD', text: '#D4820A' },
  'Brand Guides': { bg: '#E8F4FD', text: '#2E86C1' },
  'Campaign Tips': { bg: '#E8F8F5', text: '#1A8F6F' },
  'Industry News': { bg: '#F3E8FF', text: '#8B5CF6' },
};

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] || { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {category}
    </span>
  );
}

export default function BlogIndexPage() {
  const featured = BLOG_POSTS.filter(p => p.featured);
  const rest = BLOG_POSTS.filter(p => !p.featured);

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'InfluenceIT Blog',
    description: 'Data-driven influencer marketing insights for brands.',
    url: 'https://influenceit.app/blog',
    publisher: {
      '@type': 'Organization',
      name: 'InfluenceIT',
      url: 'https://influenceit.app',
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14">
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <a href="/" className="hover:text-gray-600 transition-colors">InfluenceIT</a>
            <span>/</span>
            <span className="text-gray-600 font-medium">Blog</span>
          </nav>

          <div className="w-8 h-1 bg-[#FFD700] rounded-full mb-6" />

          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
            Influencer Marketing{' '}
            <span style={{ color: '#FF4D94' }}>Insights</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-xl leading-relaxed">
            Data-driven insights for brands working with creators. Real numbers from our database of 2,200+ verified Instagram and TikTok creators.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

        {/* ── Featured posts ────────────────────────────── */}
        {featured.length > 0 && (
          <section className="mb-14">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">Featured</h2>
            <div className="space-y-6">
              {featured.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block rounded-2xl border border-gray-200 bg-white p-7 hover:border-[#FFD700] hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <CategoryBadge category={post.category} />
                    <span className="text-xs text-gray-400">{formatDate(post.publishedAt)} · {post.readingTime} min read</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 leading-snug group-hover:text-[#3A3A3A] transition-colors mb-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                    {post.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-gray-900 group-hover:text-[#D4820A] transition-colors">
                    Read article
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── All posts ─────────────────────────────────── */}
        {rest.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">All Posts</h2>
            <div className="space-y-4">
              {rest.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex items-start justify-between gap-6 px-6 py-5 rounded-2xl border border-gray-100 bg-white hover:border-[#FFD700] hover:bg-amber-50 transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CategoryBadge category={post.category} />
                      <span className="text-xs text-gray-400">{post.readingTime} min read</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 leading-snug text-base">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{post.description}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-[#FFD700] flex-shrink-0 mt-1 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Bottom CTA ────────────────────────────────── */}
        <div className="mt-16 rounded-2xl bg-gray-900 px-8 py-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#FFD700] rounded-b-full" />
          <div className="relative z-10">
            <p className="text-xl font-extrabold text-white">Ready to find the right creators for your brand?</p>
            <p className="mt-2 text-gray-300 text-sm max-w-md mx-auto">
              Browse 2,200+ verified creators with real engagement data, analytics, and direct contact.
            </p>
            <a
              href="/signup"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm hover:brightness-95 transition-all"
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

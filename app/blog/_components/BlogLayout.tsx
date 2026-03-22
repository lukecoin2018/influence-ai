// ─────────────────────────────────────────────────────────────
// app/blog/_components/BlogLayout.tsx
// Wraps every blog post with consistent header, footer, and CTA
// ─────────────────────────────────────────────────────────────
import Link from 'next/link';
import { formatDate, type BlogPost } from '@/lib/blog/types';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Data & Insights': { bg: '#FFF3CD', text: '#D4820A' },
  'Brand Guides': { bg: '#E8F4FD', text: '#2E86C1' },
  'Campaign Tips': { bg: '#E8F8F5', text: '#1A8F6F' },
  'Industry News': { bg: '#F3E8FF', text: '#8B5CF6' },
};

interface BlogLayoutProps {
  post: BlogPost;
  children: React.ReactNode;
  relatedSlugs?: string[];
}

export default function BlogLayout({ post, children, relatedSlugs }: BlogLayoutProps) {
  const colors = CATEGORY_COLORS[post.category] || { bg: '#F3F4F6', text: '#6B7280' };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    author: { '@type': 'Organization', name: 'InfluenceIT', url: 'https://influenceit.app' },
    publisher: { '@type': 'Organization', name: 'InfluenceIT', url: 'https://influenceit.app' },
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    url: `https://influenceit.app/blog/${post.slug}`,
    mainEntityOfPage: `https://influenceit.app/blog/${post.slug}`,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://influenceit.app' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://influenceit.app/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `https://influenceit.app/blog/${post.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* ── Article header ────────────────────────────── */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <a href="/" className="hover:text-gray-600 transition-colors">InfluenceIT</a>
            <span>/</span>
            <Link href="/blog" className="hover:text-gray-600 transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-gray-600 font-medium truncate max-w-[200px]">{post.title}</span>
          </nav>

          {/* Category + meta */}
          <div className="flex items-center gap-3 mb-5">
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              {post.category}
            </span>
            <span className="text-sm text-gray-400">
              {formatDate(post.publishedAt)} · {post.readingTime} min read
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
            {post.title}
          </h1>

          {/* Description */}
          <p className="mt-4 text-lg text-gray-500 leading-relaxed">
            {post.description}
          </p>

          {/* Methodology note */}
          <div className="mt-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
            <span className="text-base flex-shrink-0">📊</span>
            <p className="text-sm text-amber-800">
              <strong>Data source:</strong> Analysis of 2,200+ verified Instagram and TikTok creators in the InfluenceIT database. All engagement data is real and independently verified.
            </p>
          </div>
        </div>
      </div>

      {/* ── Article body ──────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="prose prose-gray prose-lg max-w-none
          prose-headings:font-extrabold prose-headings:text-gray-900
          prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-gray-600 prose-p:leading-relaxed
          prose-strong:text-gray-900
          prose-a:text-[#D4820A] prose-a:no-underline hover:prose-a:underline
          prose-ul:text-gray-600 prose-ol:text-gray-600
          prose-li:my-1
          prose-table:text-sm prose-table:w-full
          prose-th:bg-gray-50 prose-th:font-semibold prose-th:text-gray-700 prose-th:text-left prose-th:px-4 prose-th:py-3
          prose-td:px-4 prose-td:py-3 prose-td:border-b prose-td:border-gray-100 prose-td:text-gray-600
          prose-blockquote:border-l-4 prose-blockquote:border-[#FFD700] prose-blockquote:bg-amber-50 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
        ">
          {children}
        </div>

        {/* ── Author / source note ──────────────────────── */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#FFD700] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">InfluenceIT Data Team</p>
            <p className="text-xs text-gray-500">Based on verified data from the InfluenceIT creator database</p>
          </div>
        </div>

        {/* ── CTA ───────────────────────────────────────── */}
        <div className="mt-12 rounded-2xl bg-amber-50 border border-[#FFD700] px-8 py-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD700] rounded-l-2xl" />
          <div className="relative z-10">
            <p className="font-bold text-gray-900 text-lg">
              Ready to find verified creators with real engagement data?
            </p>
            <p className="text-gray-600 text-sm mt-1">
              Browse 2,200+ Instagram and TikTok creators across 54 categories — all with real engagement metrics.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm hover:brightness-95 transition-all"
                style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}
              >
                Get Started Free →
              </a>
              <a
                href="/discover"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 bg-white hover:border-[#FFD700] transition-all text-gray-700"
              >
                Browse Creators
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

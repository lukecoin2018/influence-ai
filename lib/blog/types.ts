// ─────────────────────────────────────────────────────────────
// lib/blog/types.ts
// ─────────────────────────────────────────────────────────────

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date string e.g. "2026-03-22"
  category: string;
  readingTime: number; // minutes
  featured?: boolean;
}

// Registry of all blog posts — add new posts here
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'average-instagram-engagement-rate-by-niche-2026',
    title: 'Average Instagram Engagement Rate by Niche in 2026',
    description: 'Real engagement rate data from 2,200+ verified Instagram creators across 12 niches. Find out which categories deliver the highest engagement and what it means for your brand campaigns.',
    publishedAt: '2026-03-22',
    category: 'Data & Insights',
    readingTime: 6,
    featured: true,
  },
  {
    slug: 'instagram-vs-tiktok-engagement-for-brands-2026',
    title: 'Instagram vs TikTok: Which Platform Has Better Engagement for Brands in 2026?',
    description: 'We analyzed 2,200+ verified creators across both platforms. Here\'s what the data actually says about engagement rates, average views, and which platform drives better results for brand campaigns.',
    publishedAt: '2026-03-22',
    category: 'Data & Insights',
    readingTime: 7,
    featured: true,
  },
  {
    slug: 'micro-vs-macro-influencers-engagement-data-2026',
    title: 'Micro vs Macro Influencers: What the Engagement Data Actually Shows',
    description: 'Does follower count predict engagement? We broke down engagement rates across four follower tiers using real data from 2,200+ verified creators. The results might surprise you.',
    publishedAt: '2026-03-22',
    category: 'Data & Insights',
    readingTime: 5,
    featured: false,
  },
  {
    slug: 'how-to-find-instagram-creators-for-brand-partnerships',
    title: 'How to Find Instagram Creators for Brand Partnerships in 2026',
    description: 'A practical guide for marketing managers and brand teams. How to identify the right creators, evaluate engagement quality, and structure partnerships that actually drive results.',
    publishedAt: '2026-03-22',
    category: 'Brand Guides',
    readingTime: 8,
    featured: false,
  },
  {
    slug: 'how-often-should-influencers-post-2026',
    title: 'How Often Should Influencers Post? Frequency Data from 2,200+ Creators',
    description: 'Does posting frequency affect engagement? We analyzed posting habits across 2,200+ verified creators. Here\'s what the data shows and what it means for your brand campaigns.',
    publishedAt: '2026-03-22',
    category: 'Data & Insights',
    readingTime: 6,
    featured: false,
  },
];

export function getBlogPost(slug: string): BlogPost | null {
  return BLOG_POSTS.find(p => p.slug === slug) || null;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

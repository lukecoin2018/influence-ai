import { MetadataRoute } from 'next';
import { getAllSlugs } from '@/lib/discover/config';
import { BLOG_POSTS } from '@/lib/blog/types';
import { getAllEsSlugs } from '@/lib/discover/es-config';

/**
 * /creators/[handle] is deliberately absent.
 *
 * It used to publish 5,296 profile URLs in one unauthenticated file. Google
 * evaluated them and declined: 1 indexed page site-wide, 2,292 sitting under
 * "Crawled — currently not indexed" on a flat trend (Search Console,
 * 2026-08-12). So the only party consuming the list was whoever scrapes it, and
 * removing it costs nothing in search — there is no ranking or traffic to lose.
 *
 * The pages themselves stay crawlable on purpose: no noindex, and robots.txt
 * still allows /creators/. The public teaser and the claim entrance are
 * legitimately public; only the analysis behind them is gated. What is removed
 * here is the enumeration — the file that handed a scraper every handle at once.
 * Similar Creators, the other traversal path into the set, is gated in the page.
 *
 * Leave /discover, /es/discover, /es-es/discover, /blog and the marketing pages
 * exactly as they are; that surface is unchanged.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const discoverSlugs = getAllSlugs();
  const discoverPages: MetadataRoute.Sitemap = discoverSlugs.map((slug) => ({
    url: `https://influenceit.app/discover/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `https://influenceit.app/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const esPages: MetadataRoute.Sitemap = getAllEsSlugs('es').map((slug) => ({
    url: `https://influenceit.app/es/discover/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
   
  const esEsPages: MetadataRoute.Sitemap = getAllEsSlugs('es-ES').map((slug) => ({
    url: `https://influenceit.app/es-es/discover/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    { url: 'https://influenceit.app', lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://influenceit.app/creators', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://influenceit.app/match', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://influenceit.app/discover', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://influenceit.app/blog', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    {
      url: 'https://influenceit.app/es/discover',
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: 'https://influenceit.app/es-es/discover',
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    ...discoverPages,
    ...blogPages,
    ...esPages,
    ...esEsPages,
  ];
}
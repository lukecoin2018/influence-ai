import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { getAllSlugs } from '@/lib/discover/config';
import { BLOG_POSTS } from '@/lib/blog/types';
import { getAllEsSlugs } from '@/lib/discover/es-config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: creators } = await supabase
    .from('social_profiles')
    .select('handle, last_updated_at')
    .gte('follower_count', 50000)
    .lte('follower_count', 500000)
    .limit(10000);

  const seenHandles = new Set<string>();
  const creatorPages: MetadataRoute.Sitemap = (creators || [])
    .filter((creator) => {
      if (!creator.handle || seenHandles.has(creator.handle)) return false;
      seenHandles.add(creator.handle);
      return true;
    })
    .map((creator) => ({
      url: `https://influenceit.app/creators/${creator.handle}`,
      lastModified: creator.last_updated_at ? new Date(creator.last_updated_at) : new Date('2026-03-29'),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

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
    ...creatorPages,
    ...esPages,
    ...esEsPages,
  ];
}
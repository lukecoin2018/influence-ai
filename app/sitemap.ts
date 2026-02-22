// app/sitemap.ts
import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: creators } = await supabase
    .from('v_creator_summary')
    .select('instagram_handle, tiktok_handle, creator_id')
    .limit(10000);

  const creatorPages = (creators || [])
    .map((creator) => {
      const handle = creator.instagram_handle || creator.tiktok_handle;
      if (!handle) return null;
      return {
        url: `https://influenceit.app/creators/${handle}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      };
    })
    .filter(Boolean) as MetadataRoute.Sitemap;

  return [
    {
      url: 'https://influenceit.app',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://influenceit.app/creators',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: 'https://influenceit.app/match',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...creatorPages,
  ];
}

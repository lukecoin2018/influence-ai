// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/creator-dashboard/', '/api/', '/admin/'],
    },
    sitemap: 'https://influenceai.com/sitemap.xml',
  };
}

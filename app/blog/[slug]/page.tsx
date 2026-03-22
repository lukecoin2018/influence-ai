// ─────────────────────────────────────────────────────────────
// app/blog/[slug]/page.tsx
// ─────────────────────────────────────────────────────────────
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { BLOG_POSTS, getBlogPost } from '@/lib/blog/types';
import BlogLayout from '../_components/BlogLayout';

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  const url = `https://influenceit.app/blog/${slug}`;
  return {
    title: `${post.title} | InfluenceIT`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: 'InfluenceIT',
      type: 'article',
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const postComponents: Record<string, React.ComponentType> = {
    'average-instagram-engagement-rate-by-niche-2026': (await import('../posts/average-instagram-engagement-rate-by-niche-2026.mdx')).default,
    'instagram-vs-tiktok-engagement-for-brands-2026': (await import('../posts/instagram-vs-tiktok-engagement-for-brands-2026.mdx')).default,
    'micro-vs-macro-influencers-engagement-data-2026': (await import('../posts/micro-vs-macro-influencers-engagement-data-2026.mdx')).default,
    'how-to-find-instagram-creators-for-brand-partnerships': (await import('../posts/how-to-find-instagram-creators-for-brand-partnerships.mdx')).default,
 'how-often-should-influencers-post-2026': (await import('../posts/how-often-should-influencers-post-2026.mdx')).default,
  };
  
  const PostContent = postComponents[slug];
  if (!PostContent) notFound();

  return (
    <BlogLayout post={post}>
      <PostContent />
    </BlogLayout>
  );
}

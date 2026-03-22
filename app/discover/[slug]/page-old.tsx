// ─────────────────────────────────────────────────────────────
// app/discover/[slug]/page.tsx
// ─────────────────────────────────────────────────────────────
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase-server';

import {
  DISCOVER_PAGES,
  PLATFORM_LABEL,
  toSafeCreator,
  getEducationalContent,
  type SafeCreator,
} from '@/lib/discover/config';

import CreatorCard from '../_components/CreatorCard';
import MidPageCTA from '../_components/MidPageCTA';
import StatsBar from '../_components/StatsBar';
import RelatedNiches from '../_components/RelatedNiches';
import EducationalContent from '../_components/EducationalContent';

export const revalidate = 86400;

export async function generateStaticParams() {
  return Object.keys(DISCOVER_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pageConfig = DISCOVER_PAGES[slug];
  if (!pageConfig) return {};

  const fullTitle = `${pageConfig.title} (2026) | InfluenceIT`;
  const url = `https://influenceit.app/discover/${slug}`;

  return {
    title: fullTitle,
    description: pageConfig.description,
    alternates: { canonical: url },
    openGraph: {
      title: pageConfig.title,
      description: pageConfig.description,
      url,
      siteName: 'InfluenceIT',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageConfig.title,
      description: pageConfig.description,
    },
  };
}

const SIGNUP_URL = '/signup';
const CTA_INSERT_INTERVAL = 9;

export default async function DiscoverSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pageConfig = DISCOVER_PAGES[slug];
  if (!pageConfig) notFound();

  const supabase = await createSupabaseServerClient();

  // ── Fetch creators ────────────────────────────────────────
  // CRITICAL: never select handle column
  const { data: rawCreators, error } = await supabase
    .from('social_profiles')
    .select(
      'display_name:creators!inner(display_name), platform, follower_count, detected_city, detected_country, ai_summary',
    )
    .eq('platform', pageConfig.platform)
    .gte('follower_count', 50_000)
    .lte('follower_count', 500_000)
    .ilike('ai_summary', `%${pageConfig.searchKeyword}%`)
    .order('follower_count', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[discover] Supabase error:', error.message);
  }

  // ── Get real total count for this niche ───────────────────
  const { count: totalCount } = await supabase
    .from('social_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('platform', pageConfig.platform)
    .gte('follower_count', 50_000)
    .lte('follower_count', 500_000)
    .ilike('ai_summary', `%${pageConfig.searchKeyword}%`);

  // ── Flatten join and strip identifying info ───────────────
  const flatCreators = (rawCreators ?? []).map((row: any) => ({
    display_name:
      typeof row.creators === 'object' && row.creators !== null
        ? row.creators.display_name
        : row.display_name ?? null,
    platform: row.platform,
    follower_count: row.follower_count,
    detected_city: row.detected_city,
    detected_country: row.detected_country,
    ai_summary: row.ai_summary,
  }));

  const safeCreators: SafeCreator[] = flatCreators.map(toSafeCreator);

  const totalCreators = totalCount ?? safeCreators.length;
  const platformLabel = PLATFORM_LABEL[pageConfig.platform];
  const year = new Date().getFullYear();
  const eduContent = getEducationalContent(pageConfig.category);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <a href="/" className="hover:text-gray-600 transition-colors">InfluenceIT</a>
            <span>/</span>
            <a href="/discover" className="hover:text-gray-600 transition-colors">Discover</a>
            <span>/</span>
            <span className="text-gray-600 font-medium">{platformLabel} {pageConfig.category}</span>
          </nav>

          {/* Platform pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 mb-5">
            {pageConfig.platform === 'instagram' ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="ig-pill" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f09433" />
                    <stop offset="100%" stopColor="#bc1888" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-pill)" />
                <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
                <circle cx="17.2" cy="6.8" r="1.2" fill="white" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="5" fill="#010101" />
                <path d="M16.5 5.5C17.1 6.3 18 6.8 19 6.9V9.4C18 9.3 17.1 9 16.3 8.5V13.5C16.3 16.0 14.2 18 11.7 18C9.2 18 7.1 16.0 7.1 13.5C7.1 11.0 9.2 9.0 11.7 9.0C11.9 9.0 12.1 9.0 12.3 9.0V11.6C12.1 11.5 11.9 11.5 11.7 11.5C10.5 11.5 9.6 12.4 9.6 13.5C9.6 14.6 10.5 15.5 11.7 15.5C12.9 15.5 13.8 14.6 13.8 13.5V5.5H16.5Z" fill="white" />
              </svg>
            )}
            {platformLabel}
          </div>

          {/* H1 */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight max-w-3xl">
            Top {platformLabel} {pageConfig.category} Creators for Brand Partnerships ({year})
          </h1>

          <p className="mt-5 text-lg text-gray-500 max-w-2xl leading-relaxed">
            {pageConfig.description}
          </p>

          <div className="mt-10">
            <StatsBar
              totalCreators={totalCreators}
              avgEngagement={null}
              platform={pageConfig.platform}
              category={pageConfig.category}
            />
          </div>
        </div>
      </div>

      {/* ── Creator Grid ──────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {safeCreators.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">
              We&apos;re adding more {pageConfig.category.toLowerCase()} creators soon.
            </p>
            <p className="mt-2 text-sm">
              <a href={SIGNUP_URL} className="text-gray-700 underline underline-offset-2">Sign up</a>{' '}
              to get notified when this category is ready.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {safeCreators.map((creator, i) => (
              <React.Fragment key={i}>
                {i > 0 && i % CTA_INSERT_INTERVAL === 0 && (
                  <MidPageCTA signupUrl={SIGNUP_URL} category={pageConfig.category} />
                )}
                <CreatorCard creator={creator} signupUrl={SIGNUP_URL} />
              </React.Fragment>
            ))}
          </div>
        )}

        <EducationalContent heading={eduContent.heading} paragraphs={eduContent.paragraphs} />
        <RelatedNiches relatedSlugs={pageConfig.related} currentSlug={slug} />

        {/* ── Final CTA ─────────────────────────────────── */}
        <section className="mt-16 rounded-2xl bg-gray-900 px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#FFD700] rounded-b-full" />
          <div className="relative z-10">
            <p className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Ready to find your perfect{' '}
              <span className="text-[#FFD700]">{pageConfig.category.toLowerCase()}</span>{' '}
              creator?
            </p>
            <p className="mt-3 text-gray-300 text-base max-w-xl mx-auto">
              InfluenceIT has {totalCreators}+ verified creators across 54 categories with real
              engagement data, analytics, and direct contact.
            </p>
            <a
              href={SIGNUP_URL}
              className="mt-8 inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-base transition-all"
              style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}
            >
              Explore {pageConfig.category} Creators
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

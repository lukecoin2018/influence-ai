// app/es-es/discover/[slug]/page.tsx
// Spain Spanish discover pages — handles both location and niche types

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getEsPageConfig, getAllEsSlugs, SPANISH_COUNTRIES } from '@/lib/discover/es-config';
import { toSafeCreator, type SafeCreator } from '@/lib/discover/config';
import CreatorCard from '@/app/discover/_components/CreatorCard';

export const revalidate = 86400;

export async function generateStaticParams() {
  return getAllEsSlugs('es-ES').map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = getEsPageConfig(slug, 'es-ES');
  if (!config) return {};

  const url = `https://influenceit.app/es-es/discover/${slug}`;

  return {
    title: `${config.title} | InfluenceIT`,
    description: config.description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: url,
      languages: {
        'en': `https://influenceit.app/discover/${config.englishSlug}`,
        'es-ES': url,
      },
    },
    openGraph: {
      title: config.title,
      description: config.description,
      url,
      siteName: 'InfluenceIT',
      type: 'website',
    },
  };
}

const SIGNUP_URL = '/signup';

async function fetchCreators(config: ReturnType<typeof getEsPageConfig>, supabase: any) {
  if (!config) return { creators: [], total: 0 };

  const baseSelect = 'display_name:creators!inner(display_name), platform, follower_count, detected_city, detected_country, ai_summary';

  if (config.type === 'location' && config.locationMatch) {
    const locationOr = config.locationMatch
      .map((l) => `detected_country.ilike.%${l}%,detected_city.ilike.%${l}%`)
      .join(',');

    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from('social_profiles')
        .select(baseSelect)
        .eq('platform', config.platform)
        .gte('follower_count', 50_000)
        .lte('follower_count', 500_000)
        .or(locationOr)
        .order('follower_count', { ascending: false })
        .limit(30),
      supabase
        .from('social_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('platform', config.platform)
        .gte('follower_count', 50_000)
        .lte('follower_count', 500_000)
        .or(locationOr),
    ]);
    if (error) console.error('[es-es/discover] location error:', error.message);
    return { creators: data ?? [], total: count ?? 0 };
  }

  if (config.type === 'niche' && config.searchKeyword) {
    const countryOr = SPANISH_COUNTRIES
      .map((c) => `detected_country.ilike.%${c}%`)
      .join(',');

    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from('social_profiles')
        .select(baseSelect)
        .eq('platform', config.platform)
        .gte('follower_count', 50_000)
        .lte('follower_count', 500_000)
        .ilike('ai_summary', `%${config.searchKeyword}%`)
        .or(countryOr)
        .order('follower_count', { ascending: false })
        .limit(30),
      supabase
        .from('social_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('platform', config.platform)
        .gte('follower_count', 50_000)
        .lte('follower_count', 500_000)
        .ilike('ai_summary', `%${config.searchKeyword}%`)
        .or(countryOr),
    ]);
    if (error) console.error('[es-es/discover] niche error:', error.message);
    return { creators: data ?? [], total: count ?? 0 };
  }

  return { creators: [], total: 0 };
}

export default async function EsEsDiscoverPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getEsPageConfig(slug, 'es-ES');
  if (!config) notFound();

  const supabase = await createSupabaseServerClient();
  const { creators: rawCreators, total } = await fetchCreators(config, supabase);

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
  const totalCreators = total ?? safeCreators.length;
  const platformLabel = config.platform === 'instagram' ? 'Instagram' : 'TikTok';
  const pageLabel = config.type === 'location' ? config.locationLabel : platformLabel;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'InfluenceIT', item: 'https://influenceit.app' },
      { '@type': 'ListItem', position: 2, name: 'Descubrir', item: 'https://influenceit.app/es-es/discover' },
      { '@type': 'ListItem', position: 3, name: config.title, item: `https://influenceit.app/es-es/discover/${slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Hero */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <a href="/" className="hover:text-gray-600 transition-colors">InfluenceIT</a>
            <span>/</span>
            <a href="/es-es/discover" className="hover:text-gray-600 transition-colors">Descubrir</a>
            <span>/</span>
            <span className="text-gray-600 font-medium truncate max-w-[240px]">{pageLabel}</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 mb-5">
            {config.platform === 'instagram' && (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="ig-es-es" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f09433" />
                    <stop offset="100%" stopColor="#bc1888" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-es-es)" />
                <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
                <circle cx="17.2" cy="6.8" r="1.2" fill="white" />
              </svg>
            )}
            {config.platform === 'tiktok' && (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="5" fill="#010101" />
                <path d="M16.5 5.5C17.1 6.3 18 6.8 19 6.9V9.4C18 9.3 17.1 9 16.3 8.5V13.5C16.3 16.0 14.2 18 11.7 18C9.2 18 7.1 16.0 7.1 13.5C7.1 11.0 9.2 9.0 11.7 9.0C11.9 9.0 12.1 9.0 12.3 9.0V11.6C12.1 11.5 11.9 11.5 11.7 11.5C10.5 11.5 9.6 12.4 9.6 13.5C9.6 14.6 10.5 15.5 11.7 15.5C12.9 15.5 13.8 14.6 13.8 13.5V5.5H16.5Z" fill="white" />
              </svg>
            )}
            {platformLabel}{config.type === 'location' && config.locationLabel ? ` · ${config.locationLabel}` : ''}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight max-w-3xl">
            {config.title}
          </h1>
          <p className="mt-5 text-lg text-gray-500 max-w-2xl leading-relaxed">
            {config.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200">
              <span className="text-2xl font-extrabold text-gray-900">{totalCreators}+</span>
              <span className="text-sm text-gray-500">creadores verificados</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200">
              <span className="text-2xl font-extrabold text-gray-900">4–8%</span>
              <span className="text-sm text-gray-500">engagement medio</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200">
              <span className="text-sm font-semibold text-gray-700">50K–500K seguidores</span>
            </div>
          </div>
        </div>
      </div>

      {/* Creator Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {safeCreators.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">Estamos añadiendo más creadores en esta categoría próximamente.</p>
            <p className="mt-2 text-sm">
              <a href={SIGNUP_URL} className="text-gray-700 underline underline-offset-2">Regístrate</a>{' '}
              para recibir notificaciones.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {safeCreators.map((creator, i) => (
              <React.Fragment key={i}>
                {i > 0 && i % 9 === 0 && (
                  <div className="col-span-full rounded-2xl bg-gray-900 px-8 py-8 text-center">
                    <p className="text-xl font-extrabold text-white">
                      ¿Quieres ver perfiles completos y datos de engagement?
                    </p>
                    <a
                      href={SIGNUP_URL}
                      className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
                      style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}
                    >
                      Regístrate gratis →
                    </a>
                  </div>
                )}
                <CreatorCard creator={creator} signupUrl={SIGNUP_URL} />
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Educational Content */}
        <div className="mt-16 rounded-2xl bg-gray-50 border border-gray-100 px-8 py-10">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-6">
            {config.educational.heading}
          </h2>
          <div className="space-y-4">
            {config.educational.paragraphs.map((p, i) => (
              <p key={i} className="text-gray-600 leading-relaxed">{p}</p>
            ))}
          </div>
        </div>

        {/* Related pages */}
        {config.related.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Explorar más</h3>
            <div className="flex flex-wrap gap-3">
              {config.related.map((relSlug) => (
                <a
                  key={relSlug}
                  href={`/es-es/discover/${relSlug}`}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-yellow-400 hover:bg-yellow-50 transition-all"
                >
                  {relSlug.replace(/-/g, ' ')} →
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Final CTA */}
        <section className="mt-16 rounded-2xl bg-gray-900 px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#FFD700] rounded-b-full" />
          <div className="relative z-10">
            <p className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              ¿Listo para encontrar tu creador perfecto?
            </p>
            <p className="mt-3 text-gray-300 text-base max-w-xl mx-auto">
              InfluenceIT tiene {totalCreators}+ creadores verificados con datos reales de engagement, analíticas y contacto directo.
            </p>
            <a
              href={SIGNUP_URL}
              className="mt-8 inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-base transition-all hover:brightness-95"
              style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}
            >
              Empieza gratis
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

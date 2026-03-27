// app/es/discover/page.tsx
// Latin American Spanish discover index

import { Metadata } from 'next';
import Link from 'next/link';
import { ES_PAGES } from '@/lib/discover/es-config';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Descubrir Influencers de América Latina (2026) | InfluenceIT',
  description: 'Explora nuestra base de datos de creadores verificados de Instagram y TikTok en Colombia, México, Perú, Chile y más. Filtra por país, plataforma y categoría con datos reales de engagement.',
  alternates: {
    canonical: 'https://influenceit.app/es/discover',
    languages: {
      'en': 'https://influenceit.app/discover',
      'es': 'https://influenceit.app/es/discover',
    },
  },
};

function ChevronRight() {
  return (
    <svg className="w-4 h-4 text-gray-300 group-hover:text-[#FFD700] transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function InstagramBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="ig-idx-es" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-idx-es)" />
        <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
        <circle cx="17.2" cy="6.8" r="1.2" fill="white" />
      </svg>
      Instagram
    </span>
  );
}

function TikTokBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="5" fill="#010101" />
        <path d="M16.5 5.5C17.1 6.3 18 6.8 19 6.9V9.4C18 9.3 17.1 9 16.3 8.5V13.5C16.3 16.0 14.2 18 11.7 18C9.2 18 7.1 16.0 7.1 13.5C7.1 11.0 9.2 9.0 11.7 9.0C11.9 9.0 12.1 9.0 12.3 9.0V11.6C12.1 11.5 11.9 11.5 11.7 11.5C10.5 11.5 9.6 12.4 9.6 13.5C9.6 14.6 10.5 15.5 11.7 15.5C12.9 15.5 13.8 14.6 13.8 13.5V5.5H16.5Z" fill="white" />
      </svg>
      TikTok
    </span>
  );
}

const COUNTRY_PAGES = [
  { slug: 'creadores-instagram-colombia', label: 'Colombia', emoji: '🇨🇴', platform: 'instagram' },
  { slug: 'creadores-tiktok-colombia', label: 'Colombia', emoji: '🇨🇴', platform: 'tiktok' },
  { slug: 'creadores-instagram-mexico', label: 'México', emoji: '🇲🇽', platform: 'instagram' },
  { slug: 'creadores-tiktok-mexico', label: 'México', emoji: '🇲🇽', platform: 'tiktok' },
  { slug: 'creadores-instagram-peru', label: 'Perú', emoji: '🇵🇪', platform: 'instagram' },
  { slug: 'creadores-tiktok-peru', label: 'Perú', emoji: '🇵🇪', platform: 'tiktok' },
  { slug: 'creadores-instagram-chile', label: 'Chile', emoji: '🇨🇱', platform: 'instagram' },
  { slug: 'creadores-tiktok-chile', label: 'Chile', emoji: '🇨🇱', platform: 'tiktok' },
];

const NICHE_PAGES = [
  { slug: 'belleza-instagram-latam', label: 'Belleza', platform: 'instagram', emoji: '✨' },
  { slug: 'belleza-tiktok-latam', label: 'Belleza', platform: 'tiktok', emoji: '✨' },
  { slug: 'moda-instagram-latam', label: 'Moda', platform: 'instagram', emoji: '👗' },
  { slug: 'moda-tiktok-latam', label: 'Moda', platform: 'tiktok', emoji: '👗' },
  { slug: 'fitness-instagram-latam', label: 'Fitness', platform: 'instagram', emoji: '💪' },
  { slug: 'fitness-tiktok-latam', label: 'Fitness', platform: 'tiktok', emoji: '💪' },
  { slug: 'lifestyle-instagram-latam', label: 'Lifestyle', platform: 'instagram', emoji: '🌿' },
  { slug: 'lifestyle-tiktok-latam', label: 'Lifestyle', platform: 'tiktok', emoji: '🌿' },
  { slug: 'wellness-instagram-latam', label: 'Wellness', platform: 'instagram', emoji: '🧘' },
  { slug: 'wellness-tiktok-latam', label: 'Wellness', platform: 'tiktok', emoji: '🧘' },
];

export default function EsDiscoverIndexPage() {
  const totalPages = Object.keys(ES_PAGES).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14">
          <div className="w-8 h-1 bg-[#FFD700] rounded-full mb-6" />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight max-w-2xl">
            Descubrir Influencers{' '}
            <span style={{ color: '#FF4D94' }}>de América Latina</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-xl leading-relaxed">
            Explora nuestra base de datos de creadores verificados de Instagram y TikTok en Colombia, México, Perú, Chile y más — con datos reales de engagement.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { icon: '📊', text: 'Datos verificados' },
              { icon: '✅', text: 'Perfiles auténticos' },
              { icon: '📍', text: '4+ países' },
              { icon: '🎯', text: '5 categorías' },
            ].map((pill) => (
              <span key={pill.text} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-600 font-medium">
                {pill.icon} {pill.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">

        {/* By Country */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-gray-900">Por País</h2>
            <p className="text-sm text-gray-500 mt-1">Encuentra creadores verificados en tu mercado objetivo</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {COUNTRY_PAGES.map((page) => (
              <Link
                key={page.slug}
                href={`/es/discover/${page.slug}`}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-[#FFD700] hover:bg-amber-50 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{page.emoji}</span>
                  <div>
                    <span className="text-sm font-medium text-gray-700 block">{page.label}</span>
                  </div>
                  {page.platform === 'instagram' ? <InstagramBadge /> : <TikTokBadge />}
                </div>
                <ChevronRight />
              </Link>
            ))}
          </div>
        </section>

        {/* By Niche */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-gray-900">Por Nicho</h2>
            <p className="text-sm text-gray-500 mt-1">Creadores hispanohablantes filtrados por categoría de contenido</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NICHE_PAGES.map((page) => (
              <Link
                key={page.slug}
                href={`/es/discover/${page.slug}`}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-[#FFD700] hover:bg-amber-50 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{page.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{page.label}</span>
                  {page.platform === 'instagram' ? <InstagramBadge /> : <TikTokBadge />}
                </div>
                <ChevronRight />
              </Link>
            ))}
          </div>
        </section>

        {/* Link to Spain */}
        <section className="rounded-2xl border border-gray-200 bg-gray-50 px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">¿Buscas creadores en España?</p>
              <p className="text-sm text-gray-500 mt-1">Tenemos páginas específicas para el mercado español</p>
            </div>
            <Link
              href="/es-es/discover"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-95"
              style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}
            >
              Ver España →
            </Link>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gray-900 px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#FFD700] rounded-b-full" />
          <div className="relative z-10">
            <p className="text-2xl font-extrabold text-white">Ver perfiles completos y datos de engagement</p>
            <p className="mt-2 text-gray-300 text-base max-w-lg mx-auto">
              Tasas de engagement, analíticas, frecuencia de publicación y contacto directo — todo en una plataforma.
            </p>
            <a
              href="/signup"
              className="mt-8 inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-base hover:brightness-95 transition-all"
              style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}
            >
              Empieza gratis
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

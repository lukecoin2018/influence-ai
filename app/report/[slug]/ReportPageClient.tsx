'use client'

import { SafeCreatorCard } from './page'
import Image from 'next/image'

// ─── Brand colors ─────────────────────────────────────────────────────────────
// Gold: #FFD700  Pink: #FF4D94  Blue: #3AAFF4  Grey: #3A3A3A

// ─── Platform icons ────────────────────────────────────────────────────────────

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="17" cy="7" r="1.2" fill="white" />
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="24" x2="24" y2="0">
          <stop stopColor="#F9A825" />
          <stop offset="0.5" stopColor="#E91E8C" />
          <stop offset="1" stopColor="#512DA8" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#010101" />
      <path
        d="M17 8.5a4 4 0 01-4-4v8a3 3 0 11-3-3"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}

// ─── Creator Card ──────────────────────────────────────────────────────────────

function CreatorCard({ creator, index }: { creator: SafeCreatorCard; index: number }) {
  return (
    <div
      className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top accent bar */}
      <div
        className="h-1 w-full"
        style={{
          background: index % 3 === 0
            ? 'linear-gradient(90deg, #FFD700, #FF4D94)'
            : index % 3 === 1
            ? 'linear-gradient(90deg, #3AAFF4, #FFD700)'
            : 'linear-gradient(90deg, #FF4D94, #3AAFF4)',
        }}
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Avatar placeholder + name */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{
                background: index % 2 === 0
                  ? 'linear-gradient(135deg, #FFD700, #FF4D94)'
                  : 'linear-gradient(135deg, #3AAFF4, #FFD700)',
              }}
            >
              {creator.first_name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-[#3A3A3A] text-base leading-tight">
                {creator.first_name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{creator.category}</p>
            </div>
          </div>

          {/* Platform icon + follower range */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              {creator.platform === 'instagram' ? (
                <InstagramIcon size={20} />
              ) : (
                <TikTokIcon size={20} />
              )}
            </div>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: '#FFF8DC', color: '#B8860B' }}
            >
              {creator.follower_range}
            </span>
          </div>
        </div>

        {/* Teaser text */}
        <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2">
          {creator.teaser}
        </p>

        {/* Gated stats */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
          {/* Engagement rate — blurred */}
          <div className="flex-1 relative">
            <p className="text-xs text-gray-400 mb-0.5">Engagement Rate</p>
            <div className="flex items-center gap-1.5">
              <p
                className="text-sm font-semibold text-[#3A3A3A] select-none"
                style={{ filter: 'blur(5px)', userSelect: 'none' }}
              >
                {creator.engagement_rate !== null
                  ? `${creator.engagement_rate.toFixed(1)}%`
                  : '4.2%'}
              </p>
              <LockIcon />
            </div>
          </div>

          {/* Full profile — blurred */}
          <div className="flex-1 relative">
            <p className="text-xs text-gray-400 mb-0.5">Full Profile</p>
            <div className="flex items-center gap-1.5">
              <p
                className="text-sm font-semibold text-[#3AAFF4] select-none"
                style={{ filter: 'blur(4px)', userSelect: 'none' }}
              >
                View Profile →
              </p>
              <LockIcon />
            </div>
          </div>

          {/* Contact — blurred */}
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-0.5">Contact</p>
            <div className="flex items-center gap-1.5">
              <p
                className="text-sm font-semibold text-[#FF4D94] select-none"
                style={{ filter: 'blur(4px)', userSelect: 'none' }}
              >
                Connect →
              </p>
              <LockIcon />
            </div>
          </div>
        </div>

        {/* Unlock overlay button */}
        <a
          href="/signup?role=brand"
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border transition-all duration-200 hover:shadow-sm"
          style={{
            borderColor: '#FFD700',
            color: '#B8860B',
            background: 'rgba(255,215,0,0.06)',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,215,0,0.14)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,215,0,0.06)'
          }}
        >
          <LockIcon />
          Unlock full profile
        </a>
      </div>
    </div>
  )
}

// ─── Page Client ───────────────────────────────────────────────────────────────

export default function ReportPageClient({
  brandName,
  creators,
}: {
  brandName: string
  creators: SafeCreatorCard[]
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Minimal nav ─────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 no-underline">
            <span
              className="text-xl font-extrabold tracking-tight"
              style={{ color: '#3A3A3A' }}
            >
              Influence
              <span style={{ color: '#FFD700' }}>IT</span>
            </span>
          </a>
          <a
            href="/signup?role=brand"
            className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #FFD700, #FF4D94)' }}
          >
            Sign up free
          </a>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div
        className="py-14 px-4 sm:px-6 text-center"
        style={{
          background: 'linear-gradient(160deg, #fff 0%, #fffbea 60%, #fff0f7 100%)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full text-xs font-semibold border"
            style={{ borderColor: '#FFD700', color: '#B8860B', background: 'rgba(255,215,0,0.08)' }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: '#FFD700', boxShadow: '0 0 0 3px rgba(255,215,0,0.3)' }}
            />
            Personalised creator report
          </div>

          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 leading-tight"
            style={{ color: '#3A3A3A' }}
          >
            {creators.length} Creators Matched for{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #FFD700, #FF4D94)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {brandName}
            </span>
          </h1>
          <p className="text-base text-gray-500 max-w-lg mx-auto">
            We analysed our database of 2,700+ verified creators and found these
            matches based on your brand&apos;s niche and partnership history.
          </p>
        </div>
      </div>

      {/* ── Creator grid ─────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {creators.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No creators found for this report.</p>
            <p className="text-sm mt-1">Please contact InfluenceIT to update this report.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {creators.map((creator, i) => (
              <CreatorCard key={creator.id} creator={creator} index={i} />
            ))}
          </div>
        )}

        {/* ── CTA block ───────────────────────────────────────────────────────── */}
        <div
          className="mt-14 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #3A3A3A 0%, #1a1a1a 100%)',
          }}
        >
          {/* Decorative blobs */}
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 pointer-events-none"
            style={{ background: '#FFD700', filter: 'blur(40px)' }}
          />
          <div
            className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-20 pointer-events-none"
            style={{ background: '#FF4D94', filter: 'blur(40px)' }}
          />

          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              Want to see full profiles,<br />
              engagement data &amp; connect?
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Sign up free to unlock every creator&apos;s full stats, contact details, and
              start building partnerships today.
            </p>
            <a
              href="/signup?role=brand"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-[#3A3A3A] transition-transform hover:scale-105 active:scale-100"
              style={{ background: 'linear-gradient(135deg, #FFD700, #FF9500)' }}
            >
              Sign up free →
            </a>
            <p className="text-xs text-gray-500 mt-4">No credit card required · Free forever plan available</p>
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="text-center py-8 px-4 text-xs text-gray-400">
        <p>
          Powered by{' '}
          <a href="/" className="font-semibold" style={{ color: '#FFD700' }}>
            InfluenceIT
          </a>{' '}
          — AI-powered creator discovery
        </p>
      </footer>
    </div>
  )
}

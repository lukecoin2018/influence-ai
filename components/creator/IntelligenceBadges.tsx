'use client'

// /components/creator/IntelligenceBadges.tsx
// Reusable location and language badge components used across:
//   - Creator profile header
//   - Creator cards (discovery page)
//   - Match result cards

import { getLanguageName } from '@/lib/language-utils'

interface LocationBadgeProps {
  city?: string | null
  country?: string | null
  /** 'default' for full-size profile, 'compact' for cards */
  size?: 'default' | 'compact'
}

export function LocationBadge({ city, country, size = 'default' }: LocationBadgeProps) {
  if (!city && !country) return null

  const label = [city, country].filter(Boolean).join(', ')

  if (size === 'compact') {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-slate-500">
        <span>📍</span>
        <span>{label}</span>
      </span>
    )
  }

  return (
    <span
      className="
        inline-flex items-center gap-1.5 px-3 py-1.5
        text-sm font-medium text-slate-600
        bg-slate-50 border border-slate-200
        rounded-full
      "
    >
      <span>📍</span>
      <span>{label}</span>
    </span>
  )
}

interface LanguageBadgeProps {
  languageCode?: string | null
  size?: 'default' | 'compact'
}

export function LanguageBadge({ languageCode, size = 'default' }: LanguageBadgeProps) {
  const name = getLanguageName(languageCode)
  if (!name) return null

  if (size === 'compact') {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-slate-500">
        <span>🌐</span>
        <span>{name}</span>
      </span>
    )
  }

  return (
    <span
      className="
        inline-flex items-center gap-1.5 px-3 py-1.5
        text-sm font-medium text-slate-600
        bg-slate-50 border border-slate-200
        rounded-full
      "
    >
      <span>🌐</span>
      <span>{name}</span>
    </span>
  )
}

/**
 * Combined inline row for both badges — used on creator cards.
 * Only renders if at least one piece of data exists.
 */
interface IntelligenceBadgeRowProps {
  city?: string | null
  country?: string | null
  primaryLanguage?: string | null
  size?: 'default' | 'compact'
}

export function IntelligenceBadgeRow({
  city,
  country,
  primaryLanguage,
  size = 'compact',
}: IntelligenceBadgeRowProps) {
  const hasLocation = city || country
  const hasLanguage = primaryLanguage

  if (!hasLocation && !hasLanguage) return null

  return (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      {hasLocation && (
        <LocationBadge city={city} country={country} size={size} />
      )}
      {hasLanguage && (
        <LanguageBadge languageCode={primaryLanguage} size={size} />
      )}
    </div>
  )
}

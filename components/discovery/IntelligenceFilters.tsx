'use client'

// /components/discovery/IntelligenceFilters.tsx
// New filter section for language, country, and email availability

import { useEffect, useState } from 'react'
import { Globe, MapPin, Mail } from 'lucide-react'
import { LANGUAGE_OPTIONS } from '@/lib/language-utils'

interface IntelligenceFiltersProps {
  language: string
  country: string
  hasEmail: boolean
  onChange: (filters: { language?: string; country?: string; hasEmail?: boolean }) => void
}

export function IntelligenceFilters({
  language,
  country,
  hasEmail,
  onChange,
}: IntelligenceFiltersProps) {
  const [countries, setCountries] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/creators/countries')
      .then((r) => r.json())
      .then((data) => setCountries(data.countries || []))
      .catch(console.error)
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* ── Language dropdown ───────────────────────────────── */}
      <div className="relative flex items-center gap-1.5">
        <Globe className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <select
          value={language}
          onChange={(e) => onChange({ language: e.target.value })}
          className="
            appearance-none pl-8 pr-8 py-2 text-sm
            bg-white border border-slate-200 rounded-lg
            text-slate-700 font-medium
            focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400
            hover:border-slate-300 transition-colors
            cursor-pointer
          "
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* chevron */}
        <svg
          className="absolute right-2 h-3.5 w-3.5 text-slate-400 pointer-events-none"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>

      {/* ── Country dropdown ────────────────────────────────── */}
      <div className="relative flex items-center gap-1.5">
        <MapPin className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <select
          value={country}
          onChange={(e) => onChange({ country: e.target.value })}
          className="
            appearance-none pl-8 pr-8 py-2 text-sm
            bg-white border border-slate-200 rounded-lg
            text-slate-700 font-medium
            focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400
            hover:border-slate-300 transition-colors
            cursor-pointer
            max-w-[180px]
          "
        >
          <option value="">All Countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-2 h-3.5 w-3.5 text-slate-400 pointer-events-none"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>

      {/* ── Has Email checkbox ───────────────────────────────── */}
      <label className="flex items-center gap-2 cursor-pointer select-none group">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            checked={hasEmail}
            onChange={(e) => onChange({ hasEmail: e.target.checked })}
            className="
              w-4 h-4 rounded border-slate-300 
              text-violet-600 
              focus:ring-violet-500/30 focus:ring-2
              cursor-pointer
            "
          />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
          <Mail className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-medium">Has business email</span>
        </div>
      </label>

      {/* ── Active filter badges ─────────────────────────────── */}
      {(language || country || hasEmail) && (
        <button
          onClick={() => onChange({ language: '', country: '', hasEmail: false })}
          className="
            ml-1 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium
            text-slate-500 hover:text-slate-700
            border border-slate-200 hover:border-slate-300
            rounded-full bg-slate-50 hover:bg-slate-100
            transition-all
          "
        >
          Clear filters
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </div>
  )
}

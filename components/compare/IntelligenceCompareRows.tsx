// /components/compare/IntelligenceCompareRows.tsx
// Drop these rows into your existing compare table/grid.
// Each row compares Language, Location, and Contact Email across creators.

import { getLanguageName } from '@/lib/language-utils'

interface CreatorIntelligence {
  id: string
  username: string
  city?: string | null
  country?: string | null
  primary_language?: string | null
  contact_email?: string | null
}

interface IntelligenceCompareRowsProps {
  creators: CreatorIntelligence[]
  isLoggedIn?: boolean
}

export function IntelligenceCompareRows({
  creators,
  isLoggedIn = false,
}: IntelligenceCompareRowsProps) {
  return (
    <>
      {/* ── Language row ──────────────────────────────────── */}
      <CompareRow
        label="Language"
        icon="🌐"
        cells={creators.map((c) => {
          const name = getLanguageName(c.primary_language)
          return name ? (
            <span className="text-sm text-slate-700 font-medium">{name}</span>
          ) : (
            <span className="text-sm text-slate-300">—</span>
          )
        })}
      />

      {/* ── Location row ──────────────────────────────────── */}
      <CompareRow
        label="Location"
        icon="📍"
        cells={creators.map((c) => {
          const loc = [c.city, c.country].filter(Boolean).join(', ')
          return loc ? (
            <span className="text-sm text-slate-700 font-medium">{loc}</span>
          ) : (
            <span className="text-sm text-slate-300">—</span>
          )
        })}
      />

      {/* ── Contact Email row ─────────────────────────────── */}
      <CompareRow
        label="Business Email"
        icon="📧"
        cells={creators.map((c) =>
          c.contact_email ? (
            <span
              className="
                inline-flex items-center gap-1
                text-sm font-semibold text-emerald-600
              "
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {isLoggedIn ? (
                <a
                  href={`mailto:${c.contact_email}`}
                  className="hover:underline text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  {c.contact_email}
                </a>
              ) : (
                <span className="text-xs text-violet-500 font-medium">Sign up to view</span>
              )}
            </span>
          ) : (
            <span
              className="
                inline-flex items-center gap-1
                text-sm font-medium text-slate-300
              "
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs">Not available</span>
            </span>
          )
        )}
      />
    </>
  )
}

// ─── Internal helper ─────────────────────────────────────────────────────────

interface CompareRowProps {
  label: string
  icon: string
  cells: React.ReactNode[]
}

function CompareRow({ label, icon, cells }: CompareRowProps) {
  return (
    <tr className="border-t border-slate-100">
      {/* Row label */}
      <td className="py-3.5 px-4 text-sm font-medium text-slate-500 whitespace-nowrap">
        <span className="mr-1.5">{icon}</span>
        {label}
      </td>

      {/* Data cells — one per creator */}
      {cells.map((cell, i) => (
        <td key={i} className="py-3.5 px-4 text-center">
          {cell}
        </td>
      ))}
    </tr>
  )
}

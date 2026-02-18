'use client'

// /components/creator/AiSummaryCard.tsx
// The "executive summary" card shown near the top of creator profiles.
// Only renders when ai_summary is present.

interface AiSummaryCardProps {
  summary: string | null | undefined
  creatorHandle?: string
}

export function AiSummaryCard({ summary, creatorHandle }: AiSummaryCardProps) {
  if (!summary) return null

  return (
    <section
      aria-label="AI Creator Summary"
      className="
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br from-violet-50 via-white to-indigo-50/60
        border border-violet-100/80
        p-6
        shadow-sm shadow-violet-100/40
      "
    >
      {/* Decorative background glow */}
      <div
        aria-hidden
        className="
          absolute -top-10 -right-10 w-40 h-40 rounded-full 
          bg-violet-200/30 blur-3xl pointer-events-none
        "
      />
      <div
        aria-hidden
        className="
          absolute -bottom-10 -left-5 w-32 h-32 rounded-full
          bg-indigo-200/20 blur-2xl pointer-events-none
        "
      />

      {/* Header */}
      <div className="relative flex items-center gap-2.5 mb-4">
        {/* Sparkle icon */}
        <div
          className="
            flex items-center justify-center w-7 h-7 rounded-lg
            bg-gradient-to-br from-violet-500 to-indigo-600
            shadow-sm
          "
        >
          <svg
            className="w-3.5 h-3.5 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-violet-900 tracking-wide uppercase">
          About this Creator
        </h2>
      </div>

      {/* Summary text */}
      <p
        className="
          relative text-slate-700 text-[15px] leading-relaxed
          font-[450]
        "
      >
        {summary}
      </p>

      {/* Footer label */}
      <p className="relative mt-4 text-xs text-violet-400 font-medium">
        ✦ AI-generated insight
      </p>
    </section>
  )
}

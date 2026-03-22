// ─────────────────────────────────────────────────────────────
// app/discover/_components/MidPageCTA.tsx
// ─────────────────────────────────────────────────────────────

interface MidPageCTAProps {
  signupUrl: string;
  category: string;
}

export default function MidPageCTA({ signupUrl, category }: MidPageCTAProps) {
  return (
    <div className="col-span-full my-2">
      <div className="relative overflow-hidden rounded-2xl bg-amber-50 border border-[#FFD700] px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Gold left accent */}
        <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD700] rounded-l-2xl" />

        <div className="relative z-10">
          <p className="text-gray-900 font-semibold text-lg leading-snug">
            Want full profiles, engagement data &amp; direct contact?
          </p>
          <p className="text-gray-500 text-sm mt-1">
            See engagement rates, analytics, hashtags, and reach out to any{' '}
            {category.toLowerCase()} creator directly.
          </p>
        </div>

        <a
          href={signupUrl}
          className="relative z-10 flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm hover:brightness-95 transition-all"
          style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}
        >
          Get Started Free
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
}

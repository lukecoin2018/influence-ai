'use client'

// /components/creator/ContactEmail.tsx
// Shows contact email to logged-in brands, teaser to logged-out visitors.
// Used inside the creator profile page.

import Link from 'next/link'

interface ContactEmailProps {
  email: string | null | undefined
  isLoggedIn: boolean
}

export function ContactEmail({ email, isLoggedIn }: ContactEmailProps) {
  // If no email exists at all, render nothing
  if (!email) return null

  return (
    <div className="flex items-center gap-2">
      {isLoggedIn ? (
        /* Logged-in: show full email as a mailto link */
        <a
          href={`mailto:${email}`}
          className="
            inline-flex items-center gap-2 px-3 py-1.5
            text-sm font-medium text-emerald-700
            bg-emerald-50 border border-emerald-200
            rounded-full
            hover:bg-emerald-100 hover:border-emerald-300
            transition-colors
            group
          "
        >
          <span>📧</span>
          <span className="group-hover:underline">{email}</span>
        </a>
      ) : (
        /* Logged-out: teaser to drive sign-up */
        <Link
          href="/auth/signup"
          className="
            inline-flex items-center gap-2 px-3 py-1.5
            text-sm font-medium text-slate-500
            bg-slate-50 border border-slate-200 border-dashed
            rounded-full
            hover:bg-violet-50 hover:border-violet-300 hover:text-violet-600
            transition-colors
            group
          "
        >
          <span>📧</span>
          <span>Email available —</span>
          <span className="text-violet-500 font-semibold group-hover:underline">
            sign up to view
          </span>
          <svg
            className="h-3.5 w-3.5 text-violet-400"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 12l4-4-4-4" />
          </svg>
        </Link>
      )}
    </div>
  )
}

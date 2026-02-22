// components/Footer.tsx
// LMG Media rebrand — replace your entire existing Footer.tsx with this file.
// Adjust the links columns to match whatever links you had before.

import Link from 'next/link'

export function Footer() {
  return (
    <footer
      style={{ backgroundColor: '#3A3A3A', color: '#FFFFFF' }}
      className="mt-auto"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* ── Brand column ── */}
          <div className="md:col-span-1">
            <h3
              style={{ color: '#FFD700' }}
              className="text-xl font-extrabold mb-3 tracking-tight"
            >
              InfluenceIT
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>
              AI-powered influencer matching for modern brands.
            </p>
          </div>

          {/* ── Platform column ── */}
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: '#9CA3AF' }}
            >
              Platform
            </h4>
            <ul className="space-y-2">
              {[
                { href: '/creators', label: 'Browse Creators' },
                { href: '/match',    label: 'AI Matching'     },
                { href: '/compare',  label: 'Compare'         },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm transition-colors"
                    style={{ color: '#9CA3AF' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#FFD700')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Account column ── */}
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: '#9CA3AF' }}
            >
              Account
            </h4>
            <ul className="space-y-2">
              {[
                { href: '/login',   label: 'Login'   },
                { href: '/signup',  label: 'Sign Up' },
                { href: '/contact', label: 'Contact' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm transition-colors"
                    style={{ color: '#9CA3AF' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#FFD700')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Legal column ── */}
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: '#9CA3AF' }}
            >
              Legal
            </h4>
            <ul className="space-y-2">
              {[
                { href: '/privacy', label: 'Privacy Policy'  },
                { href: '/terms',   label: 'Terms of Service' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm transition-colors"
                    style={{ color: '#9CA3AF' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#FFD700')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3"
          style={{ borderTop: '1px solid #4B5563' }}
        >
          <p className="text-sm" style={{ color: '#6B7280' }}>
            © {new Date().getFullYear()} InfluenceIT. All rights reserved.
          </p>

          {/* LMG Media attribution — required by brief */}
          <p className="text-sm" style={{ color: '#6B7280' }}>
            An{' '}
            <a
              href="https://lmg.media"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold transition-colors underline underline-offset-2"
              style={{ color: '#FFD700' }}
            >
              LMG Media
            </a>{' '}
            Platform
          </p>
        </div>
      </div>
    </footer>
  )
}

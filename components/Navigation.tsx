'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { getNavStrings } from '@/lib/i18n/nav-strings';
import { useLocale } from '@/lib/i18n/use-locale';

// Labels are resolved per locale at render (see `t` below) rather than stored
// here, so the desktop and mobile menus keep sharing one source of truth.
const navLinks = [
  { href: '/creators', key: 'creators' as const },
  { href: '/match', key: 'findCreators' as const, highlight: true },
  { href: '/compare', key: 'compare' as const },
  { href: '/discover', key: 'discover' as const },
  { href: '/about', key: 'about' as const },
];

export function Navigation() {
  const pathname = usePathname();
  const { user, brandProfile, userRole, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  // Client component, so it resolves its own strings rather than receiving them
  // as a prop — same approach as the other localized surfaces.
  const t = getNavStrings(useLocale());

  return (
    <header
      className="sticky top-0 z-50 border-b border-base"
      style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between" style={{ height: '64px' }}>

        {/* Logo */}
        <Link href="/" className="flex items-center no-underline" onClick={() => setMenuOpen(false)} aria-label="InfluenceIT">
          {/* Light-header lockup from the brand kit (public/brand/usage.md).
              The wordmark is 18px here, the minimum the kit allows on a light
              background for the pink "IT" to pass contrast. */}
          <img src="/brand/lockup-light-bg-small.svg" alt="InfluenceIT" width={158} height={28} style={{ display: 'block' }} />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, key, highlight }) => {
            const label = t.links[key];
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg font-medium no-underline px-4 py-2 text-sm flex items-center gap-1.5 ${
                  isActive ? 'bg-purple-light text-purple' : 'text-secondary hover:text-primary hover:bg-subtle'
                }`}
              >
                {highlight && <Sparkles size={11} color={isActive ? '#FFD700' : '#9CA3AF'} style={{ marginBottom: '1px' }} />}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {userRole === 'creator' ? (
                <Link
                  href="/creator-dashboard"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium no-underline ${
                    pathname.startsWith('/creator-dashboard') ? 'bg-purple-light text-purple' : 'text-secondary hover:text-primary hover:bg-subtle'
                  }`}
                >
                  <User size={14} />
                  {t.account.myProfile}
                </Link>
              ) : userRole === 'brand' ? (
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium no-underline ${
                    pathname.startsWith('/dashboard') ? 'bg-purple-light text-purple' : 'text-secondary hover:text-primary hover:bg-subtle'
                  }`}
                >
                  <User size={14} />
                  {brandProfile?.company_name ?? t.account.dashboardFallback}
                </Link>
              ) : null}
              <button
                onClick={signOut}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-subtle"
                style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg font-medium no-underline px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-subtle">
                {t.account.logIn}
              </Link>
              <Link href="/signup" className="bg-purple rounded-lg font-medium no-underline px-4 py-2 text-sm" style={{ color: '#3A3A3A' }}>
                {t.account.signUp}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex md:hidden items-center justify-center rounded-lg"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ width: '36px', height: '36px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#3A3A3A' }}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div
          className="md:hidden"
          style={{ borderTop: '1px solid #E5E7EB', backgroundColor: 'white', paddingBottom: '16px' }}
        >
          {/* Nav links */}
          <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {navLinks.map(({ href, key, highlight }) => {
              const label = t.links[key];
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg font-medium no-underline px-4 py-3 text-sm flex items-center gap-2 ${
                    isActive ? 'bg-purple-light text-purple' : 'text-secondary hover:text-primary hover:bg-subtle'
                  }`}
                >
                  {highlight && <Sparkles size={12} color={isActive ? '#FFD700' : '#9CA3AF'} />}
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: '#F3F4F6', margin: '8px 16px' }} />

          {/* Auth links */}
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {user ? (
              <>
                {userRole === 'creator' && (
                  <Link
                    href="/creator-dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium no-underline text-secondary hover:text-primary hover:bg-subtle"
                  >
                    <User size={14} />
                    {t.account.myProfile}
                  </Link>
                )}
                {userRole === 'brand' && (
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium no-underline text-secondary hover:text-primary hover:bg-subtle"
                  >
                    <User size={14} />
                    {brandProfile?.company_name ?? t.account.dashboardFallback}
                  </Link>
                )}
                <button
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-secondary hover:text-primary hover:bg-subtle"
                  style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                >
                  <LogOut size={14} />
                  {t.account.logOut}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg font-medium no-underline px-4 py-3 text-sm text-secondary hover:text-primary hover:bg-subtle"
                >
                  {t.account.logIn}
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg font-medium no-underline px-4 py-3 text-sm text-center"
                  style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}
                >
                  {t.account.signUp}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

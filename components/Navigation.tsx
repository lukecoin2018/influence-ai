'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Sparkles, User, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navLinks = [
  { href: '/creators', label: 'Creators' },
  { href: '/match', label: 'Find Creators', highlight: true },
  { href: '/compare', label: 'Compare' },
  { href: '/about', label: 'About' },
];

export function Navigation() {
  const pathname = usePathname();
  const { user, brandProfile, userRole, signOut } = useAuth();

  return (
    <header
      className="sticky top-0 z-50 border-b border-base"
      style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between" style={{ height: '64px' }}>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline">
        <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: '32px', height: '32px', backgroundColor: '#FFD700' }}>
          <BarChart2 size={16} color="#3A3A3A" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-primary" style={{ fontSize: '15px', letterSpacing: '-0.01em' }}>
            InfluenceAI
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, highlight }) => {
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

        {/* Auth section */}
        {user ? (
          <div className="flex items-center gap-2">
            {userRole === 'creator' ? (
              <Link
                href="/creator-dashboard"
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium no-underline ${
                  pathname.startsWith('/creator-dashboard') ? 'bg-purple-light text-purple' : 'text-secondary hover:text-primary hover:bg-subtle'
                }`}
              >
                <User size={14} />
                My Profile
              </Link>
            ) : userRole === 'brand' ? (
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium no-underline ${
                  pathname.startsWith('/dashboard') ? 'bg-purple-light text-purple' : 'text-secondary hover:text-primary hover:bg-subtle'
                }`}
              >
                <User size={14} />
                {brandProfile?.company_name ?? 'Dashboard'}
              </Link>
            ) : null /* admin — no nav link shown */}
            <button
              onClick={signOut}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-subtle"
              style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg font-medium no-underline px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-subtle">
              Log in
            </Link>
            <Link href="/signup" className="bg-purple rounded-lg font-medium no-underline px-4 py-2 text-sm" style={{ color: '#3A3A3A' }}>
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

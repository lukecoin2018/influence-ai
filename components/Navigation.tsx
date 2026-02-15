'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Sparkles } from 'lucide-react';

const navLinks = [
  { href: '/creators', label: 'Creators' },
  { href: '/match', label: 'Find Creators', highlight: true },
  { href: '/compare', label: 'Compare' },
  { href: '/about', label: 'About' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 border-b border-base"
      style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between" style={{ height: '64px' }}>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div
            className="bg-purple flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ width: '32px', height: '32px' }}
          >
            <BarChart2 size={16} color="white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-primary" style={{ fontSize: '15px', letterSpacing: '-0.01em' }}>
            InfluenceAI
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, highlight}) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg font-medium no-underline px-4 py-2 text-sm flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-purple-light text-purple'
                    : 'text-secondary hover:text-primary hover:bg-subtle'
                }`}
              >
                {highlight && <Sparkles size={12} color={isActive ? '#7C3AED' : '#9CA3AF'} />}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* CTA */}
        <Link
          href="/creators"
          className="bg-purple text-white rounded-lg font-medium no-underline px-4 py-2 text-sm hover:bg-purple"
        >
          Explore Creators
        </Link>
      </div>
    </header>
  );
}
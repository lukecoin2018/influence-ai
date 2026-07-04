'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function scrollToSection(e: React.MouseEvent, id: string) {
  e.preventDefault();
  const el = document.getElementById(id);
  if (!el) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, brandProfile, userRole, signOut } = useAuth();

  // Same role-based destinations as the light Navigation component.
  const accountHref = userRole === 'creator' ? '/creator-dashboard' : userRole === 'brand' ? '/dashboard' : null;
  const accountLabel = userRole === 'creator' ? 'My Profile' : userRole === 'brand' ? (brandProfile?.company_name ?? 'Dashboard') : null;

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav>
      <div className="wrap nav-in">
        <Link className="logo" href="/">
          <span className="logo-mark"><i></i><i></i><i></i></span>
          Influence<em>IT</em>
        </Link>
        <div className="nav-links">
          <a href="#board" onClick={(e) => scrollToSection(e, 'board')}>Leaderboard</a>
          <Link href="/creators">Creators</Link>
          <Link href="/compare">Compare</Link>
          <a href="#method" onClick={(e) => scrollToSection(e, 'method')}>Methodology</a>
        </div>
        <div className="nav-right">
          {user ? (
            <>
              {accountHref && accountLabel && <Link className="signin" href={accountHref}>{accountLabel}</Link>}
              <button type="button" className="signin" onClick={() => signOut()} style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}>
                Sign out
              </button>
            </>
          ) : (
            <Link className="signin" href="/login">Sign in</Link>
          )}
          <Link className="btn btn-yellow" href="/creators">Explore the database</Link>
          <button
            type="button"
            className="nav-mobile-toggle"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
            style={{ background: 'none', border: 'none', color: '#F2F0EA', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px' }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="nav-mobile-menu">
          <a href="#board" onClick={(e) => { scrollToSection(e, 'board'); closeMenu(); }}>Leaderboard</a>
          <Link href="/creators" onClick={closeMenu}>Creators</Link>
          <Link href="/compare" onClick={closeMenu}>Compare</Link>
          <a href="#method" onClick={(e) => { scrollToSection(e, 'method'); closeMenu(); }}>Methodology</a>
          {user ? (
            <>
              {accountHref && accountLabel && <Link href={accountHref} onClick={closeMenu}>{accountLabel}</Link>}
              <button
                type="button"
                onClick={() => { signOut(); closeMenu(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" onClick={closeMenu}>Sign in</Link>
          )}
          <Link className="btn btn-yellow" href="/creators" onClick={closeMenu}>Explore the database</Link>
        </div>
      )}
    </nav>
  );
}

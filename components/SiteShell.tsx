'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  // Exact match only — the homepage ships its own dark nav/footer. startsWith('/')
  // would match every route on the site and kill the shared nav everywhere.
  const isHome = pathname === '/';
  // /report/[slug] also ships its own dark nav/footer (matches the homepage's
  // dark/yellow identity for shareable brand reports) — same reasoning as isHome.
  const isReport = pathname.startsWith('/report/');
  // /claim/[handle] is a cold-DM conversion landing page — the site nav's exit
  // routes (Discover/Compare/About/Sign up) compete with its one job (claim).
  // It ships its own minimal logo + legal-only footer instead of the full shell.
  const isClaim = pathname.startsWith('/claim/');

  if (isAdmin || isHome || isReport || isClaim) {
    return <>{children}</>;
  }

  return (
    <>
      <Navigation />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </>
  );
}

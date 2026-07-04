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

  if (isAdmin || isHome) {
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

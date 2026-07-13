'use client';

import { useEffect } from 'react';

/**
 * Root layout hardcodes <html lang="en"> and, being the one place Next.js
 * allows an <html> tag, can't be overridden per-route without a site-wide
 * change. Scoped fix instead: flip the attribute client-side for the
 * lifetime of this page, revert on unmount. Same pattern the /es/discover
 * pages don't yet have — this route gets it right rather than inheriting
 * that gap.
 */
export function HtmlLangSync({ lang }: { lang: string }) {
  useEffect(() => {
    const prev = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = prev;
    };
  }, [lang]);
  return null;
}

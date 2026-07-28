'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { Locale } from '@/app/claim/[handle]/_strings';

/** Untrusted input in every case — anything that isn't exactly 'en'/'es' is "no opinion". */
function normalize(raw: string | null | undefined): Locale | null {
  if (raw === 'es') return 'es';
  if (raw === 'en') return 'en';
  return null;
}

/**
 * Spanish route trees. /es-es is a separate geographic SEO tree and is out of
 * scope for claim, but its pages are still Spanish, so the chrome around them
 * should be too. Derived from the pathname the same way SiteShell derives
 * isClaim (components/SiteShell.tsx).
 *
 * Prefix-matched with a trailing slash so a future /establishment or /essays
 * can never be mistaken for Spanish.
 */
function localeFromPath(pathname: string): Locale | null {
  if (pathname === '/es' || pathname.startsWith('/es/')) return 'es';
  if (pathname === '/es-es' || pathname.startsWith('/es-es/')) return 'es';
  return null;
}

// Module-level so the identity is stable across renders. Back/forward changes
// the query without a React state change, so it needs a subscription; ordinary
// client-side navigation re-renders anyway, and getSnapshot runs on every
// render, so the value stays fresh without any further wiring.
function subscribeToLocation(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
}

// Returns a primitive ('en' | 'es' | null), so React's Object.is check settles
// immediately — no cached-snapshot infinite-loop hazard.
function readQueryLocale(): Locale | null {
  return normalize(new URLSearchParams(window.location.search).get('locale'));
}

// A statically prerendered route has ONE html document serving every query
// string, so during prerender and hydration there is no query to read. Saying
// so explicitly is the point of this function.
function readQueryLocaleOnServer(): Locale | null {
  return null;
}

/**
 * Resolves the UI locale for shared chrome, in priority order:
 *
 *   1. an /es/ or /es-es/ path segment
 *   2. a ?locale= query param, whitelisted to en|es
 *   3. creator_profiles.locale, via AuthContext
 *   4. 'en'
 *
 * The query param is read through useSyncExternalStore rather than
 * useSearchParams(), deliberately. useSearchParams() cannot return a value at
 * prerender time even in principle (see above), so on a static route it can
 * only bail the subtree out to client-side rendering to get one. This hook
 * runs in the root-layout nav, so that bail-out would apply to every route
 * that renders the nav — exactly the render-mode change this must not cause.
 * Every one of the six existing useSearchParams() call sites in this repo sits
 * inside a Suspense boundary; site-wide chrome has none, and adding one to
 * read one optional param is the wrong trade.
 *
 * Consequence, and it is the already-accepted one: on a prerendered page the
 * nav renders 'en' first and swaps after hydration, the same behaviour
 * HtmlLangSync already has. Paths under /es/ are the exception — those resolve
 * synchronously on the first render and never flash.
 */
export function useLocale(): Locale {
  const pathname = usePathname();
  const { creatorProfile } = useAuth();
  const queryLocale = useSyncExternalStore(
    subscribeToLocation,
    readQueryLocale,
    readQueryLocaleOnServer
  );

  return (
    localeFromPath(pathname) ??
    queryLocale ??
    normalize(creatorProfile?.locale) ??
    'en'
  );
}

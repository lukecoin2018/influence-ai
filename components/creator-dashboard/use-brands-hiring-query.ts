'use client';

// components/creator-dashboard/use-brands-hiring-query.ts
//
// `?page=` and `?sort=` for the Brands Hiring list, held in the URL so back,
// forward and refresh keep the creator where they were. Nothing is persisted
// beyond the URL — no localStorage, no profile column.
//
// ── WHY NOT useSearchParams() ──────────────────────────────────────────────
//
// The same reason lib/i18n/use-locale.ts avoids it, which documents this at
// length: useSearchParams() cannot return a value at prerender time, so it
// bails its subtree out to client-side rendering to get one, and every call
// site in this repo therefore sits inside a Suspense boundary. BrandsHiring is
// also rendered by the admin preview (a force-dynamic SERVER component at
// app/admin/preview/creator/[handle]/brands-hiring/page.tsx) which has no such
// boundary, so introducing that requirement here would change a second route's
// render behaviour to add a control that route does not even show.
//
// So this reads the location the way use-locale.ts does: useSyncExternalStore
// over `popstate`, with `window.location.search` — a STRING, so React's
// Object.is check settles immediately and there is no cached-snapshot loop —
// as the snapshot, and '' on the server, because a prerendered document has no
// query string to read.
//
// ── THE WRITE HALF, AND WHY A PRIVATE EVENT ────────────────────────────────
//
// use-locale.ts only reads. This hook also writes, and history.pushState does
// NOT fire popstate, so nothing would tell the store about our own writes. The
// obvious fix — dispatching a synthetic PopStateEvent — is worse than it
// looks: Next's App Router listens for popstate to restore its own navigation
// state, so a fake one is a message to the router, not just to us. A private
// event name nothing else listens for keeps the notification ours.
//
// ── NO EFFECT ──────────────────────────────────────────────────────────────
//
// There is deliberately no useEffect here. An effect that seeds state from the
// URL on mount is the same thing by hand, one render later, and the React
// Compiler lint rejects the synchronous setState it needs.

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { type BrandsHiringSort, DEFAULT_SORT, normalizeSort } from './brands-hiring-sort';

export type BrandsHiringQuery = {
  /**
   * 1-based, and deliberately NOT clamped to the number of pages. This hook
   * does not know how long the filtered list is; the component clamps at
   * render, so `?page=99` shows the last page without rewriting the creator's
   * URL behind their back.
   */
  page: number;
  sort: BrandsHiringSort;
};

/** Private to this module — nothing else in the app listens for it. */
const QUERY_CHANGED = 'influenceit:brands-hiring-query';

/** Untrusted URL input. Anything that is not a whole number ≥ 1 reads as page 1. */
function normalizePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

function parseQuery(search: string): BrandsHiringQuery {
  const params = new URLSearchParams(search);
  return { page: normalizePage(params.get('page')), sort: normalizeSort(params.get('sort')) };
}

// Module-level so the identity is stable across renders, as in use-locale.ts.
function subscribeToQuery(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(QUERY_CHANGED, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(QUERY_CHANGED, onChange);
  };
}

function readSearch(): string {
  return window.location.search;
}

// A statically prerendered document serves every query string, so during
// prerender and hydration there is none to read. Saying so explicitly is the
// point of this function.
function readSearchOnServer(): string {
  return '';
}

/**
 * 'push' for a choice the creator made about the URL's own state — a page or a
 * sort — which Back should undo.
 *
 * 'replace' for the page reset that rides along with a CATEGORY chip. The
 * category is component state, not URL state, so pushing there would leave a
 * history entry whose only content is a dropped `page` param: pressing Back
 * would restore `?page=3` while the screen still showed page 1 of the filtered
 * list. Replacing keeps the URL truthful without inventing a step.
 */
export type QueryWriteMode = 'push' | 'replace';

export function useBrandsHiringQuery(): [
  BrandsHiringQuery,
  (next: Partial<BrandsHiringQuery>, mode?: QueryWriteMode) => void,
] {
  const search = useSyncExternalStore(subscribeToQuery, readSearch, readSearchOnServer);
  const query = useMemo(() => parseQuery(search), [search]);

  const push = useCallback(
    (next: Partial<BrandsHiringQuery>, mode: QueryWriteMode = 'push') => {
      const merged = { ...query, ...next };

      // Built from the CURRENT search string, not from scratch, so any other
      // param on the URL survives — `?locale=es` is read by useLocale() on
      // this very page and dropping it would switch the creator's language.
      const params = new URLSearchParams(window.location.search);
      if (merged.page > 1) params.set('page', String(merged.page));
      else params.delete('page');
      if (merged.sort !== DEFAULT_SORT) params.set('sort', merged.sort);
      else params.delete('sort');

      const qs = params.toString();
      const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
      if (mode === 'replace') window.history.replaceState(null, '', url);
      else window.history.pushState(null, '', url);
      window.dispatchEvent(new Event(QUERY_CHANGED));
    },
    [query],
  );

  return [query, push];
}

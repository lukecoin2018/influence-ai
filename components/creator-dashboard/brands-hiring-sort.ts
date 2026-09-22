// components/creator-dashboard/brands-hiring-sort.ts
//
// The three orderings offered by the Brands Hiring sort control, and the
// whitelist that turns an untrusted `?sort=` value into one of them.
//
// ── WHY THIS IS NOT IN lib/reports/creator-brand-matches.ts ────────────────
//
// compareMatches() in that file is the product's ranking — the order the claim
// teaser's hero brand, the Overview and every consumer of `matches` depend on.
// It is deliberately NOT touched here. "Best match" is not recomputed; it is
// the order the list arrived in, and the other two orderings are applied on
// top of it as a presentation choice that lives with the component that offers
// the control.
//
// ── THE INDEX TIEBREAK ─────────────────────────────────────────────────────
//
// Every comparator below falls back to the item's ORIGINAL position in the
// incoming array. That array is already sorted by compareMatches(), so the
// fallback is exactly "then by best match" — the tie rule the sort control's
// third option promises, obtained without importing or duplicating the
// ranking. It also makes both sorts stable in a way that does not depend on
// Array.prototype.sort's stability guarantee being carried by a polyfill.

import type { MatchedBrand } from '@/lib/reports/creator-brand-matches';

/**
 * URL values, not labels. These strings appear in `?sort=` and are matched
 * against verbatim, so they belong to the same untranslated namespace as
 * ALL_CATEGORY in BrandsHiring.tsx — the visible text comes from the string
 * table. Never translate these.
 */
export const SORT_VALUES = ['match', 'active', 'recent'] as const;

export type BrandsHiringSort = (typeof SORT_VALUES)[number];

export const DEFAULT_SORT: BrandsHiringSort = 'match';

/** Untrusted URL input: anything not in the whitelist is "no opinion" → default. */
export function normalizeSort(raw: string | null | undefined): BrandsHiringSort {
  return SORT_VALUES.includes(raw as BrandsHiringSort) ? (raw as BrandsHiringSort) : DEFAULT_SORT;
}

/**
 * Returns a NEW array; never sorts in place. `matches` is a prop, shared with
 * the category filter's memo and with the caller's own state, and sorting it
 * in place would reorder the source of truth for "best match" out from under
 * the index tiebreak above.
 *
 * `match` returns the input untouched — no copy, no comparator — because the
 * input IS that order.
 */
export function sortMatches(matches: MatchedBrand[], sort: BrandsHiringSort): MatchedBrand[] {
  if (sort === DEFAULT_SORT) return matches;

  // Captured before sorting: after the sort, indexOf() would report the new
  // position and the tiebreak would be circular.
  const rank = new Map<MatchedBrand, number>();
  matches.forEach((m, i) => rank.set(m, i));
  const tiebreak = (a: MatchedBrand, b: MatchedBrand) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0);

  if (sort === 'active') {
    return [...matches].sort((a, b) => b.distinctCreators - a.distinctCreators || tiebreak(a, b));
  }

  // 'recent' — newest mostRecentPost first.
  //
  // mostRecentPost is `string | null` (an ISO timestamp from brand_brackets).
  // NULL means "we have no date for this brand", not "long ago", so those rows
  // go last as a block rather than being compared as the empty string — which
  // would be indistinguishable from a real 1970 date and, worse, would let a
  // dateless brand tie with one that genuinely has no recent post.
  //
  // ISO-8601 UTC strings compare lexicographically in the same order as the
  // instants they encode, so localeCompare is a correct date comparison here;
  // it is the same comparison compareMatches() makes at its term 4.
  return [...matches].sort((a, b) => {
    const aNull = a.mostRecentPost === null;
    const bNull = b.mostRecentPost === null;
    if (aNull !== bNull) return aNull ? 1 : -1;
    if (aNull && bNull) return tiebreak(a, b);
    return (b.mostRecentPost ?? '').localeCompare(a.mostRecentPost ?? '') || tiebreak(a, b);
  });
}

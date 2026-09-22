'use client';

// components/creator-dashboard/BrandsHiring.tsx
// The dedicated "Brands Hiring" page's content — full ranked list + the
// tappable category filter (design 2b). Pure props-in component (no fetch,
// no auth) so it's shared, unchanged, between the real creator route
// (app/creator-dashboard/brands-hiring/page.tsx) and the admin preview
// (app/admin/preview/creator/[handle]/brands-hiring/page.tsx) — same pattern
// as DashboardOverview.tsx.

import { useMemo, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import type { MatchedBrand } from '@/lib/reports/creator-brand-matches';
import { categoryBucketLabel, consolidateCategory, nicheLeadBucket, orderCategoriesForDisplay, summarizeCategories } from '@/lib/reports/category-consolidation';
import { BrandMatchCard } from '@/components/brand-matches/BrandMatchCard';
import { getClaimStrings, type Locale } from '@/app/claim/[handle]/_strings';
import { getDashboardStrings } from '@/lib/i18n/dashboard-strings';
import { BRANDS_HIRING_GATING_ENABLED, BRANDS_HIRING_FREE_TIER_LIMIT } from '@/lib/reports/brands-hiring-config';
import { track } from '@/lib/dashboard/track';
import { SORT_VALUES, sortMatches, type BrandsHiringSort } from './brands-hiring-sort';
import { useBrandsHiringQuery } from './use-brands-hiring-query';
import { BrandsHiringPager } from './BrandsHiringPager';

const GREY = '#3A3A3A';

/**
 * Brands per page. The page still fetches the whole list in one request
 * (676 brands today) and paginates what it RENDERS — the cost this addresses
 * is 676 cards in the DOM, not the payload.
 */
const PAGE_SIZE = 50;

/**
 * The "no filter" SENTINEL, and never a display label. It is held in
 * `selectedCategory` alongside real consolidateCategory() bucket names and
 * compared against them, so it belongs to the same untranslated namespace they
 * do and must stay English in every locale. The chip's visible text comes from
 * the string table (`t.filterAll`); these two are deliberately separate.
 */
const ALL_CATEGORY = 'All';

interface BrandsHiringProps {
  matches: MatchedBrand[];
  creatorFollowers: number | null;
  detectedNiche: string | null;
  /**
   * Base path for the per-card outreach action, e.g.
   * '/creator-dashboard/outreach'. Omitted = no action footer on any card,
   * which is exactly what the admin preview wants: an admin looking at someone
   * else's dashboard must not be handed a live control that drafts outreach as
   * them.
   *
   * A plain string rather than a callback or a ready-made actions array, for
   * two reasons. It keeps this component's props serializable, so the
   * server-rendered admin preview can keep passing props to it unchanged. And
   * it preserves the purity contract in the header above — this component still
   * has no router, no auth and no fetch; it only appends a canonical name to a
   * path the caller chose.
   */
  outreachBasePath?: string;
  /**
   * Passed in, not resolved here, for the same reason as DashboardOverview's:
   * this component keeps its props-only contract (see the header) because the
   * admin preview renders it from a force-dynamic server component, and a
   * useLocale() in here would read the admin's own (nonexistent)
   * creator_profiles row. The preview passes 'en' explicitly.
   *
   * Defaults to 'en' so any caller that has not been updated is unaffected.
   */
  locale?: Locale;
}

export function BrandsHiring({ matches, creatorFollowers, detectedNiche, outreachBasePath, locale = 'en' }: BrandsHiringProps) {
  const t = getDashboardStrings(locale).brandsHiring;
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);
  const [query, pushQuery] = useBrandsHiringQuery();
  // Anchors the page-change scroll. Deliberately the LIST, not the window: a
  // creator who clicks "3" wants the top of page 3, and scrolling past the
  // filter chips they just set would hide the state they are working with.
  const listRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const leadBucket = nicheLeadBucket(detectedNiche);
    return orderCategoriesForDisplay(summarizeCategories(matches), leadBucket);
  }, [matches, detectedNiche]);

  const filteredMatches = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) return matches;
    return matches.filter((m) => consolidateCategory(m.category) === selectedCategory);
  }, [matches, selectedCategory]);

  // Sorted AFTER the category filter and BEFORE the gate, so a future gate
  // still hands out the top N of whatever order the creator chose rather than
  // the top N of "best match" relabelled.
  const sortedMatches = useMemo(() => sortMatches(filteredMatches, query.sort), [filteredMatches, query.sort]);

  // Gating seam (lib/reports/brands-hiring-config.ts) — v1 always shows the
  // full filtered list. A future gate slots in here without touching the
  // filter/list rendering above or below.
  const visibleMatches = BRANDS_HIRING_GATING_ENABLED ? sortedMatches.slice(0, BRANDS_HIRING_FREE_TIER_LIMIT) : sortedMatches;

  // Clamped at render rather than written back to the URL. `?page=99` on a
  // two-page list shows page 2; rewriting the address bar under the creator
  // would also push a history entry they did not ask for.
  const totalPages = Math.max(1, Math.ceil(visibleMatches.length / PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageMatches = visibleMatches.slice(pageStart, pageStart + PAGE_SIZE);

  // Both reset to page 1: page 4 of a re-sorted or re-filtered list is a
  // different set of brands than the one the creator was looking at.
  //
  // The category reset REPLACES rather than pushes — see QueryWriteMode in
  // use-brands-hiring-query.ts. The category itself is not in the URL, so a
  // history entry for it would only ever be a dropped `page`.
  function selectCategory(name: string) {
    setSelectedCategory(name);
    pushQuery({ page: 1 }, 'replace');
  }

  function selectSort(sort: BrandsHiringSort) {
    pushQuery({ sort, page: 1 });
  }

  function goToPage(next: number) {
    pushQuery({ page: next });
    listRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  const sortOptionLabel: Record<BrandsHiringSort, string> = {
    match: t.sortBestMatch,
    active: t.sortMostActive,
    recent: t.sortRecentlyHiring,
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: GREY, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
          {t.title}
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          {matches.length > 0
            ? t.countLine(matches.length)
            : t.detectingSub}
        </p>
        {/* Reports the FILTERED total, so with a category chip active it says
            how many of that category there are — which is the number the pager
            below is actually paging through. */}
        {visibleMatches.length > 0 && (
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0 0' }}>
            {t.showingRange(pageStart + 1, pageStart + pageMatches.length, visibleMatches.length)}
          </p>
        )}
      </div>

      {matches.length === 0 ? (
        <div style={{
          backgroundColor: '#fff', borderRadius: '16px', padding: '48px 24px',
          border: '1px solid #E5E7EB', textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
          <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
            {t.noMatchesCard}
          </p>
        </div>
      ) : (
        <>
          {/* ── Category filter (design 2b) — tappable chips, "All" default ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <button
              onClick={() => selectCategory(ALL_CATEGORY)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '999px',
                border: selectedCategory === ALL_CATEGORY ? 'none' : '1px solid #E5E7EB',
                backgroundColor: selectedCategory === ALL_CATEGORY ? GREY : '#fff',
                color: selectedCategory === ALL_CATEGORY ? '#fff' : GREY,
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {/* Label from the table; the sentinel it sets is untranslated. */}
              {t.filterAll}
              <span style={{ opacity: 0.7 }}>{matches.length}</span>
            </button>
            {categories.map((c) => {
              const active = selectedCategory === c.name;
              return (
                <button
                  key={c.name}
                  // `c.name` — the canonical English bucket — stays the IDENTITY
                  // here and in the `active` check and the filter above. Only
                  // the text below it is localized. Wrapping either of those in
                  // categoryBucketLabel() would silently break filtering.
                  onClick={() => selectCategory(c.name)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '999px',
                    border: active ? 'none' : '1px solid #E5E7EB',
                    backgroundColor: active ? GREY : '#fff',
                    color: active ? '#fff' : GREY,
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {categoryBucketLabel(c.name, locale)}
                  <span style={{ opacity: 0.7 }}>{c.count}</span>
                </button>
              );
            })}

            {/* ── Sort control ─────────────────────────────────────────────
                A native <select> rather than three more pills: the chips above
                are already a wrapping row of up to a dozen, and a second row
                of look-alike pills that do something entirely different would
                read as more categories. `marginLeft: auto` pushes it to the
                end of the row and lets it wrap onto its own line on a phone.

                The VALUES are the untranslated 'match' | 'active' | 'recent'
                identities that live in `?sort=`; only the labels are
                localized — the same split as the category chips above. */}
            <label style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6B7280' }}>
              {t.sortLabel}
              <select
                value={query.sort}
                onChange={(e) => selectSort(e.target.value as BrandsHiringSort)}
                style={{
                  padding: '7px 10px', borderRadius: '999px', border: '1px solid #E5E7EB',
                  backgroundColor: '#fff', color: GREY, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {SORT_VALUES.map((value) => (
                  <option key={value} value={value}>{sortOptionLabel[value]}</option>
                ))}
              </select>
            </label>
          </div>

          {/* ── Ranked list ────────────────────────────────────────────── */}
          {visibleMatches.length === 0 ? (
            <div style={{
              backgroundColor: '#fff', borderRadius: '16px', padding: '32px 24px',
              border: '1px solid #E5E7EB', textAlign: 'center',
            }}>
              <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
                {/* The LOCALIZED label goes into the sentence, never the raw
                    bucket identity — and the sentence is whole per locale,
                    because Spanish puts the category after the noun and needs a
                    preposition the English wording has no slot for. */}
                {t.noCategoryMatches(categoryBucketLabel(selectedCategory, locale))}
              </p>
            </div>
          ) : (
            <>
            <div ref={listRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', scrollMarginTop: '16px' }}>
              {pageMatches.map((match) => (
                <BrandMatchCard
                  key={match.canonicalName}
                  match={match}
                  creatorFollowers={creatorFollowers}
                  // That day is today: the label follows the creator's locale
                  // instead of being pinned to 'en'. The card takes ONE locale
                  // that drives all of its copy — badge, category, follower
                  // bracket, recency, region banner and the prompt above this
                  // button — so there is no seam that would localize the button
                  // alone, and a Spanish button under an English card would read
                  // worse than either language on its own. Every key it needs
                  // already exists in both locales in _strings.ts.
                  locale={locale}
                  // The card's own `actions` prop, unchanged — it has taken
                  // these since the teaser was extracted from it. An action is
                  // a <Link href>, so this is a navigation, and the canonical
                  // name is the only brand identifier that exists to carry.
                  // Label comes from the typed string table rather than a
                  // literal, so the en and es wordings stay in one place.
                  // getClaimStrings is already in this bundle via
                  // BrandMatchCard, so this costs nothing extra.
                  actions={outreachBasePath ? [{
                    label: getClaimStrings(locale).brandMatchCard.contactBrand(match.canonicalName),
                    href: `${outreachBasePath}?brand=${encodeURIComponent(match.canonicalName)}`,
                    icon: Pencil,
                    // The card's only action today, so the only `action` value.
                    // Only wired when an outreachBasePath exists, so the admin
                    // preview (which passes none) records nothing.
                    onClick: () => track('brand_card_action', { canonical_name: match.canonicalName, platform: match.platform, action: 'contact_brand' }),
                  }] : undefined}
                />
              ))}
            </div>

            <BrandsHiringPager
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
              labels={{
                previous: t.pagerPrevious,
                next: t.pagerNext,
                pageLabel: t.pagerPageLabel,
                navLabel: t.pagerNavLabel,
              }}
            />
            </>
          )}
        </>
      )}
    </div>
  );
}

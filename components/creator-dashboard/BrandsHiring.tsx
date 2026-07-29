'use client';

// components/creator-dashboard/BrandsHiring.tsx
// The dedicated "Brands Hiring" page's content — full ranked list + the
// tappable category filter (design 2b). Pure props-in component (no fetch,
// no auth) so it's shared, unchanged, between the real creator route
// (app/creator-dashboard/brands-hiring/page.tsx) and the admin preview
// (app/admin/preview/creator/[handle]/brands-hiring/page.tsx) — same pattern
// as DashboardOverview.tsx.

import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import type { MatchedBrand } from '@/lib/reports/creator-brand-matches';
import { categoryBucketLabel, consolidateCategory, nicheLeadBucket, orderCategoriesForDisplay, summarizeCategories } from '@/lib/reports/category-consolidation';
import { BrandMatchCard } from '@/components/brand-matches/BrandMatchCard';
import { getClaimStrings, type Locale } from '@/app/claim/[handle]/_strings';
import { getDashboardStrings } from '@/lib/i18n/dashboard-strings';
import { BRANDS_HIRING_GATING_ENABLED, BRANDS_HIRING_FREE_TIER_LIMIT } from '@/lib/reports/brands-hiring-config';

const GREY = '#3A3A3A';

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

  const categories = useMemo(() => {
    const leadBucket = nicheLeadBucket(detectedNiche);
    return orderCategoriesForDisplay(summarizeCategories(matches), leadBucket);
  }, [matches, detectedNiche]);

  const filteredMatches = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) return matches;
    return matches.filter((m) => consolidateCategory(m.category) === selectedCategory);
  }, [matches, selectedCategory]);

  // Gating seam (lib/reports/brands-hiring-config.ts) — v1 always shows the
  // full filtered list. A future gate slots in here without touching the
  // filter/list rendering above or below.
  const visibleMatches = BRANDS_HIRING_GATING_ENABLED ? filteredMatches.slice(0, BRANDS_HIRING_FREE_TIER_LIMIT) : filteredMatches;

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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            <button
              onClick={() => setSelectedCategory(ALL_CATEGORY)}
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
                  onClick={() => setSelectedCategory(c.name)}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {visibleMatches.map((match) => (
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
                  }] : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

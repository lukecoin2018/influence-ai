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
import { consolidateCategory, nicheLeadBucket, orderCategoriesForDisplay, summarizeCategories } from '@/lib/reports/category-consolidation';
import { BrandMatchCard } from '@/components/brand-matches/BrandMatchCard';
import { BRANDS_HIRING_GATING_ENABLED, BRANDS_HIRING_FREE_TIER_LIMIT } from '@/lib/reports/brands-hiring-config';

const GREY = '#3A3A3A';

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
}

export function BrandsHiring({ matches, creatorFollowers, detectedNiche, outreachBasePath }: BrandsHiringProps) {
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
          Brands Hiring
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          {matches.length > 0
            ? `${matches.length} brand${matches.length === 1 ? '' : 's'} we've detected hiring creators your size.`
            : "We're detecting brands for your size — check back as we scan more."}
        </p>
      </div>

      {matches.length === 0 ? (
        <div style={{
          backgroundColor: '#fff', borderRadius: '16px', padding: '48px 24px',
          border: '1px solid #E5E7EB', textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
          <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
            No brand matches detected yet — this updates automatically as we scan more brands.
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
              All
              <span style={{ opacity: 0.7 }}>{matches.length}</span>
            </button>
            {categories.map((c) => {
              const active = selectedCategory === c.name;
              return (
                <button
                  key={c.name}
                  onClick={() => setSelectedCategory(c.name)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '999px',
                    border: active ? 'none' : '1px solid #E5E7EB',
                    backgroundColor: active ? GREY : '#fff',
                    color: active ? '#fff' : GREY,
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {c.name}
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
                No {selectedCategory} brands detected — try a different category.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {visibleMatches.map((match) => (
                <BrandMatchCard
                  key={match.canonicalName}
                  match={match}
                  creatorFollowers={creatorFollowers}
                  // The card's own `actions` prop, unchanged — it has taken
                  // these since the teaser was extracted from it. An action is
                  // a <Link href>, so this is a navigation, and the canonical
                  // name is the only brand identifier that exists to carry.
                  actions={outreachBasePath ? [{
                    label: 'Draft outreach',
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

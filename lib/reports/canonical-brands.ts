/**
 * Groups verified `brand_aliases` rows by `canonical_name` into a single logical
 * brand — grouping, not dedup: a canonical brand legitimately has multiple aliases
 * (regional handles, spelling variants; e.g. Shein = 18 aliases), and this collapses
 * them into one row for display while still counting a creator only once even if
 * they posted with two different aliases of the same brand (summing
 * brand_aliases.creators_count across aliases would double-count that creator —
 * this recomputes the union instead).
 *
 * Pure function: takes already-fetched rows, does no I/O. Callers are responsible
 * for fetching brand_aliases and the per-alias creator facts (typically via a
 * creator_posts + social_profiles join, mirroring v_brand_partnerships' shape).
 */

export type BrandAliasRow = {
  alias: string;
  canonicalName: string | null;
  entityType: string;
  category: string | null;
  region: string | null;
  verified: boolean;
};

/** One (alias, creator) fact: this creator has sponsored-post activity detected under this alias. */
export type AliasCreatorReach = {
  alias: string;
  creatorId: string;
};

export type CanonicalBrand = {
  canonicalName: string;
  /** Mode category across the canonical's aliases; ties broken alphabetically. Aliases of one canonical shouldn't disagree on category in practice, but nothing enforces it, so this stays deterministic rather than encounter-order. */
  category: string | null;
  /** Distinct regions across the canonical's aliases, sorted. Additive enrichment data, not a matching input. */
  regions: string[];
  aliasCount: number;
  distinctCreatorCount: number;
  creatorIds: string[];
};

function isAggregatable(row: BrandAliasRow): row is BrandAliasRow & { canonicalName: string } {
  return row.verified && row.entityType === 'brand' && !!row.canonicalName;
}

/** Most frequent category among a canonical's aliases; ties broken alphabetically for determinism. */
function pickCategory(categoryCounts: Map<string, number>): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const [category, count] of categoryCounts) {
    if (count > bestCount || (count === bestCount && best !== null && category < best)) {
      best = category;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Alias -> canonical_name lookup, restricted to the same eligibility rule
 * aggregateCanonicalBrands() uses (verified, entity_type='brand', canonical_name
 * set). For callers that need to resolve a raw creator_posts.detected_brands
 * alias to its canonical brand without running the full aggregation (e.g. the
 * brand_brackets refresh script, which needs per-platform grouping this module
 * doesn't do).
 */
export function buildAliasToCanonicalMap(aliasRows: BrandAliasRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of aliasRows) {
    if (isAggregatable(row)) map.set(row.alias, row.canonicalName);
  }
  return map;
}

export function aggregateCanonicalBrands(
  aliasRows: BrandAliasRow[],
  aliasCreatorReach: AliasCreatorReach[],
): CanonicalBrand[] {
  const eligibleAliases = aliasRows.filter(isAggregatable);
  if (eligibleAliases.length === 0) return [];

  const aliasToCanonical = new Map(eligibleAliases.map((row) => [row.alias, row]));

  type Accumulator = {
    canonicalName: string;
    categoryCounts: Map<string, number>;
    regions: Set<string>;
    aliasCount: number;
    creatorIds: Set<string>;
  };
  const byCanonical = new Map<string, Accumulator>();

  for (const row of eligibleAliases) {
    let acc = byCanonical.get(row.canonicalName);
    if (!acc) {
      acc = { canonicalName: row.canonicalName, categoryCounts: new Map(), regions: new Set(), aliasCount: 0, creatorIds: new Set() };
      byCanonical.set(row.canonicalName, acc);
    }
    acc.aliasCount += 1;
    if (row.region) acc.regions.add(row.region);
    if (row.category) acc.categoryCounts.set(row.category, (acc.categoryCounts.get(row.category) ?? 0) + 1);
  }

  for (const reach of aliasCreatorReach) {
    const aliasRow = aliasToCanonical.get(reach.alias);
    if (!aliasRow) continue; // reach detected under an unverified/non-brand/unclassified alias — excluded
    byCanonical.get(aliasRow.canonicalName)!.creatorIds.add(reach.creatorId);
  }

  return [...byCanonical.values()]
    .map((acc): CanonicalBrand => ({
      canonicalName: acc.canonicalName,
      category: pickCategory(acc.categoryCounts),
      regions: [...acc.regions].sort(),
      aliasCount: acc.aliasCount,
      distinctCreatorCount: acc.creatorIds.size,
      creatorIds: [...acc.creatorIds],
    }))
    .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
}

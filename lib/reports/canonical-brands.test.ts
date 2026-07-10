import { describe, expect, it } from 'vitest';
import { aggregateCanonicalBrands, type AliasCreatorReach, type BrandAliasRow } from './canonical-brands';

function alias(overrides: Partial<BrandAliasRow> & { alias: string }): BrandAliasRow {
  return {
    canonicalName: 'Shein',
    entityType: 'brand',
    category: 'Fashion',
    region: null,
    verified: true,
    ...overrides,
  };
}

function reach(overrides: AliasCreatorReach): AliasCreatorReach {
  return overrides;
}

describe('aggregateCanonicalBrands', () => {
  it('collapses multiple aliases of one brand into a single canonical row', () => {
    const aliases = [
      alias({ alias: 'shein', region: 'US' }),
      alias({ alias: 'sheinofficial', region: 'US' }),
      alias({ alias: 'sheinbrasil', region: 'BR' }),
    ];
    const reaches = [
      reach({ alias: 'shein', creatorId: 'c1' }),
      reach({ alias: 'sheinofficial', creatorId: 'c2' }),
      reach({ alias: 'sheinbrasil', creatorId: 'c3' }),
    ];

    const result = aggregateCanonicalBrands(aliases, reaches);

    expect(result).toHaveLength(1);
    expect(result[0].canonicalName).toBe('Shein');
    expect(result[0].aliasCount).toBe(3);
    expect(result[0].distinctCreatorCount).toBe(3);
  });

  it('aggregates the distinct set of regions across a canonical brand\'s aliases', () => {
    const aliases = [
      alias({ alias: 'shein', region: 'US' }),
      alias({ alias: 'sheinbrasil', region: 'BR' }),
      alias({ alias: 'sheinuk', region: 'US' }), // duplicate region, should not double up
      alias({ alias: 'sheinnoregion', region: null }), // no region, should not appear as a phantom entry
    ];

    const result = aggregateCanonicalBrands(aliases, []);

    expect(result[0].regions).toEqual(['BR', 'US']);
  });

  it('only aggregates verified, entity_type=brand aliases — unverified and non-brand rows are excluded', () => {
    const aliases = [
      alias({ alias: 'shein', verified: true }),
      alias({ alias: 'sheinleaked', canonicalName: 'Shein', verified: false }), // unverified — excluded
      alias({ alias: 'sheinvenue', canonicalName: 'Shein', verified: true, entityType: 'venue' }), // wrong entity_type — excluded
      alias({ alias: 'unrelatedunverified', canonicalName: 'Nivea', verified: false }),
    ];
    const reaches = [
      reach({ alias: 'shein', creatorId: 'c1' }),
      reach({ alias: 'sheinleaked', creatorId: 'c2' }), // tied to an unverified alias — must not count
      reach({ alias: 'sheinvenue', creatorId: 'c3' }), // tied to a non-brand entity_type — must not count
    ];

    const result = aggregateCanonicalBrands(aliases, reaches);

    expect(result).toHaveLength(1);
    expect(result[0].canonicalName).toBe('Shein');
    expect(result[0].distinctCreatorCount).toBe(1);
    expect(result[0].creatorIds).toEqual(['c1']);
  });

  it('counts a creator once even if they posted under two aliases of the same canonical brand (no summing brand_aliases.creators_count)', () => {
    const aliases = [
      alias({ alias: 'shein', region: 'US' }),
      alias({ alias: 'sheinofficial', region: 'US' }),
    ];
    const reaches = [
      reach({ alias: 'shein', creatorId: 'c1' }),
      reach({ alias: 'sheinofficial', creatorId: 'c1' }), // same creator, different alias
      reach({ alias: 'sheinofficial', creatorId: 'c2' }),
    ];

    const result = aggregateCanonicalBrands(aliases, reaches);

    expect(result[0].distinctCreatorCount).toBe(2);
    expect(result[0].creatorIds.sort()).toEqual(['c1', 'c2']);
  });

  it('returns an empty array when no aliases are eligible', () => {
    const aliases = [alias({ alias: 'shein', verified: false })];
    expect(aggregateCanonicalBrands(aliases, [])).toEqual([]);
  });

  it('picks the mode category across aliases when one dominates', () => {
    const aliases = [
      alias({ alias: 'shein', category: 'Fashion' }),
      alias({ alias: 'sheinofficial', category: 'Fashion' }),
      alias({ alias: 'sheinbeauty', category: 'Beauty' }),
    ];

    const result = aggregateCanonicalBrands(aliases, []);

    expect(result[0].category).toBe('Fashion');
  });

  it('breaks a category tie alphabetically, independent of alias encounter order', () => {
    const inOrderA = aggregateCanonicalBrands(
      [alias({ alias: 'shein', category: 'Fashion' }), alias({ alias: 'sheinbeauty', category: 'Beauty' })],
      [],
    );
    const inOrderB = aggregateCanonicalBrands(
      [alias({ alias: 'sheinbeauty', category: 'Beauty' }), alias({ alias: 'shein', category: 'Fashion' })],
      [],
    );

    expect(inOrderA[0].category).toBe('Beauty');
    expect(inOrderB[0].category).toBe('Beauty');
  });

  it('leaves category null when no alias in the group has one', () => {
    const aliases = [alias({ alias: 'shein', category: null })];
    const result = aggregateCanonicalBrands(aliases, []);
    expect(result[0].category).toBeNull();
  });
});

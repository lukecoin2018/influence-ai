import { describe, expect, it } from 'vitest';
import { consolidateCategory, summarizeCategories } from './category-consolidation';

describe('consolidateCategory', () => {
  it('merges fragmented raw categories into their approved bucket', () => {
    expect(consolidateCategory('Fitness & Wellness')).toBe('Fitness & Wellness');
    expect(consolidateCategory('Sportswear')).toBe('Fitness & Wellness');
    expect(consolidateCategory('Wellness')).toBe('Fitness & Wellness');
    expect(consolidateCategory('Food')).toBe('Food');
    expect(consolidateCategory('Food & Beverage')).toBe('Food');
    expect(consolidateCategory('Tech')).toBe('Tech & Electronics');
    expect(consolidateCategory('Consumer Electronics')).toBe('Tech & Electronics');
    expect(consolidateCategory('Home Appliances')).toBe('Home');
    expect(consolidateCategory('Home & Furniture')).toBe('Home');
    expect(consolidateCategory('Travel & Tourism')).toBe('Travel & Hospitality');
    expect(consolidateCategory('Travel')).toBe('Travel & Hospitality');
    expect(consolidateCategory('Hospitality')).toBe('Travel & Hospitality');
  });

  it('merges every entertainment split into one Entertainment bucket', () => {
    expect(consolidateCategory('Media & Entertainment')).toBe('Entertainment');
    expect(consolidateCategory('Entertainment')).toBe('Entertainment');
    expect(consolidateCategory('Entertainment & Events')).toBe('Entertainment');
    expect(consolidateCategory('Entertainment & Venues')).toBe('Entertainment');
    expect(consolidateCategory('Events')).toBe('Entertainment');
  });

  it('keeps big clean categories as their own bucket', () => {
    expect(consolidateCategory('Beauty')).toBe('Beauty');
    expect(consolidateCategory('Fashion')).toBe('Fashion');
    expect(consolidateCategory('Retail')).toBe('Retail');
    expect(consolidateCategory('Automotive')).toBe('Automotive');
    expect(consolidateCategory('Spirits')).toBe('Spirits');
  });

  it('keeps Jewelry and Pet Care standalone rather than folding them into a bigger bucket', () => {
    expect(consolidateCategory('Jewelry')).toBe('Jewelry');
    expect(consolidateCategory('Pet Care')).toBe('Pet Care');
  });

  it('routes genuine miscellany to Other', () => {
    expect(consolidateCategory('Other')).toBe('Other');
    expect(consolidateCategory('Luxury')).toBe('Other');
    expect(consolidateCategory('Services')).toBe('Other');
    expect(consolidateCategory('Shopping Center')).toBe('Other');
    expect(consolidateCategory('Crafts')).toBe('Other');
    expect(consolidateCategory('E-commerce')).toBe('Other');
    expect(consolidateCategory('Delivery & Services')).toBe('Other');
    expect(consolidateCategory('Insurance')).toBe('Other');
  });

  it('falls back to Other for null or an unrecognized future raw value', () => {
    expect(consolidateCategory(null)).toBe('Other');
    expect(consolidateCategory('Some New Category Nobody Has Seen Yet')).toBe('Other');
  });
});

describe('summarizeCategories', () => {
  it('counts distinct brands per consolidated bucket', () => {
    const matches = [
      { category: 'Beauty' },
      { category: 'Beauty' },
      { category: 'Sportswear' },
      { category: 'Fitness & Wellness' },
      { category: 'Wellness' },
    ];
    const result = summarizeCategories(matches);
    expect(result).toEqual([
      { name: 'Fitness & Wellness', count: 3 },
      { name: 'Beauty', count: 2 },
    ]);
  });

  it('sorts by count descending, then alphabetically for a deterministic tie-break', () => {
    const matches = [{ category: 'Spirits' }, { category: 'Automotive' }, { category: 'Jewelry' }];
    const result = summarizeCategories(matches);
    expect(result.map((r) => r.name)).toEqual(['Automotive', 'Jewelry', 'Spirits']);
  });

  it('returns an empty array for a creator with no matches — never a fabricated breakdown', () => {
    expect(summarizeCategories([])).toEqual([]);
  });

  it('routes a null category into Other rather than dropping the brand from the count', () => {
    const matches = [{ category: null }, { category: null }];
    expect(summarizeCategories(matches)).toEqual([{ name: 'Other', count: 2 }]);
  });
});

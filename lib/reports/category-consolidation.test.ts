import { describe, expect, it } from 'vitest';
import { consolidateCategory, nicheLeadBucket, orderCategoriesForDisplay, summarizeCategories } from './category-consolidation';

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

describe('nicheLeadBucket', () => {
  it('maps the seven clean niches to their approved bucket', () => {
    expect(nicheLeadBucket('beauty')).toBe('Beauty');
    expect(nicheLeadBucket('fashion')).toBe('Fashion');
    expect(nicheLeadBucket('fitness')).toBe('Fitness & Wellness');
    expect(nicheLeadBucket('food')).toBe('Food');
    expect(nicheLeadBucket('travel')).toBe('Travel & Hospitality');
    expect(nicheLeadBucket('tech')).toBe('Tech & Electronics');
    expect(nicheLeadBucket('ecommerce')).toBe('Retail');
  });

  it('returns null for luxury, gaming, lifestyle, and null — the approved fall-back cases', () => {
    expect(nicheLeadBucket('luxury')).toBeNull();
    expect(nicheLeadBucket('gaming')).toBeNull();
    expect(nicheLeadBucket('lifestyle')).toBeNull();
    expect(nicheLeadBucket(null)).toBeNull();
  });

  it('returns null for an unrecognized future niche value rather than guessing', () => {
    expect(nicheLeadBucket('some-new-niche-nobody-has-seen-yet')).toBeNull();
  });
});

describe('orderCategoriesForDisplay', () => {
  const categories = [
    { name: 'Beauty', count: 179 },
    { name: 'Fashion', count: 96 },
    { name: 'Fitness & Wellness', count: 21 },
    { name: 'Retail', count: 21 },
  ];

  it('moves the niche-mapped bucket to lead when the creator has matches in it', () => {
    const result = orderCategoriesForDisplay(categories, 'Fashion');
    expect(result.map((c) => c.name)).toEqual(['Fashion', 'Beauty', 'Fitness & Wellness', 'Retail']);
    // counts travel with their bucket, nothing invented or dropped
    expect(result.find((c) => c.name === 'Fashion')?.count).toBe(96);
  });

  it('leaves the order unchanged when leadBucket is null (fallback niches / no niche)', () => {
    expect(orderCategoriesForDisplay(categories, null)).toEqual(categories);
  });

  it('leaves the order unchanged when the creator has zero matches in their niche bucket — never fabricates a pill', () => {
    const result = orderCategoriesForDisplay(categories, 'Jewelry');
    expect(result).toEqual(categories);
  });

  it('leaves the order unchanged when the niche bucket already leads', () => {
    const result = orderCategoriesForDisplay(categories, 'Beauty');
    expect(result).toEqual(categories);
  });
});

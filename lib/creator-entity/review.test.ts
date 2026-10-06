import { describe, expect, it } from 'vitest';
import {
  NON_CREATOR_FILTER,
  REVIEW_TABS,
  acceptableRows,
  isMissingColumnError,
  overrideHidesClaimed,
  reviewFilter,
  tabFilter,
  type ReviewTab,
} from './review';

const CLAIMED_A = '11111111-1111-1111-1111-111111111111';
const CLAIMED_B = '22222222-2222-2222-2222-222222222222';

describe('reviewFilter', () => {
  it('holds R1-R5 without claimed accounts', () => {
    expect(reviewFilter([]).split(/,(?![^(]*\))/)).toEqual([
      'confidence.in.(medium,low)',
      'entity_type.eq.other',
      'and(entity_type.eq.creator,flag_count.gte.2)',
      'and(entity_type.neq.creator,flag_count.eq.0)',
      'and(entity_type.eq.creator,signals->>alias_match.eq.true)',
    ]);
  });

  it('R4 is any non-creator verdict with no flags — IG business alone is not support', () => {
    expect(reviewFilter([])).toContain('and(entity_type.neq.creator,flag_count.eq.0)');
    expect(reviewFilter([])).not.toContain('ig_business');
  });

  it('adds R6 for claimed accounts with a non-creator verdict', () => {
    expect(reviewFilter([CLAIMED_A, CLAIMED_B])).toContain(
      `and(entity_type.neq.creator,creator_id.in.(${CLAIMED_A},${CLAIMED_B}))`,
    );
  });

  it('leaves R6 out when no account is claimed, rather than sending an empty in.()', () => {
    expect(reviewFilter([])).not.toContain('creator_id.in');
  });
});

describe('tabFilter', () => {
  const tabs: ReviewTab[] = REVIEW_TABS.map((t) => t.value);

  it('has four tabs, Hidden among them', () => {
    expect(tabs).toEqual(['review', 'non_creators', 'hidden', 'all']);
  });

  it('applies the platform to every tab', () => {
    for (const tab of tabs) {
      expect(tabFilter(tab, { platform: 'tiktok', claimedIds: [] }).platform).toBe('tiktok');
      expect(tabFilter(tab, { platform: 'instagram', claimedIds: [] }).platform).toBe('instagram');
      expect(tabFilter(tab, { platform: 'all', claimedIds: [] }).platform).toBeNull();
    }
  });

  it('Review is unreviewed rows matching any reason, with R6 from the claimed ids', () => {
    expect(tabFilter('review', { platform: 'all', claimedIds: [CLAIMED_A] })).toEqual({
      platform: null,
      unreviewedOnly: true,
      or: reviewFilter([CLAIMED_A]),
      excludedOnly: false,
    });
  });

  it('Non-creators filters on the effective type and includes reviewed rows', () => {
    expect(tabFilter('non_creators', { platform: 'all', claimedIds: [] })).toEqual({
      platform: null,
      unreviewedOnly: false,
      or: NON_CREATOR_FILTER,
      excludedOnly: false,
    });
  });

  it('Hidden is excluded = true only', () => {
    expect(tabFilter('hidden', { platform: 'all', claimedIds: [CLAIMED_A] })).toEqual({
      platform: null,
      unreviewedOnly: false,
      or: null,
      excludedOnly: true,
    });
  });

  it('All filters on nothing but the platform', () => {
    expect(tabFilter('all', { platform: 'instagram', claimedIds: [CLAIMED_A] })).toEqual({
      platform: 'instagram',
      unreviewedOnly: false,
      or: null,
      excludedOnly: false,
    });
  });
});

describe('acceptableRows', () => {
  const rows = [
    { creator_id: 'a', entity_type: 'brand' as const, reviewed_at: null },
    { creator_id: 'b', entity_type: 'creator' as const, reviewed_at: null },
    { creator_id: 'c', entity_type: 'media' as const, reviewed_at: '2026-10-06T00:00:00Z' },
    { creator_id: CLAIMED_A, entity_type: 'brand' as const, reviewed_at: null },
  ];

  it('keeps unreviewed, unclaimed rows and skips reviewed and claimed ones', () => {
    expect(acceptableRows(rows, new Set([CLAIMED_A])).map((r) => r.creator_id)).toEqual(['a', 'b']);
  });

  it('returns nothing for an all-claimed page', () => {
    expect(acceptableRows([rows[3]], new Set([CLAIMED_A]))).toEqual([]);
  });
});

describe('overrideHidesClaimed', () => {
  const claimed = new Set([CLAIMED_A]);

  it('is true for a non-creator type on a claimed account, including other', () => {
    for (const type of ['brand', 'media', 'venue', 'other'] as const) {
      expect(overrideHidesClaimed(CLAIMED_A, type, claimed)).toBe(true);
    }
  });

  it('is false for creator, for clearing, and for unclaimed accounts', () => {
    expect(overrideHidesClaimed(CLAIMED_A, 'creator', claimed)).toBe(false);
    expect(overrideHidesClaimed(CLAIMED_A, null, claimed)).toBe(false);
    expect(overrideHidesClaimed('someone-else', 'brand', claimed)).toBe(false);
  });
});

describe('isMissingColumnError', () => {
  it('recognises the undefined-column error for that column only', () => {
    expect(isMissingColumnError({ code: '42703', message: 'column creator_entity.excluded does not exist' }, 'excluded')).toBe(true);
    expect(isMissingColumnError({ code: '42703', message: 'column creator_entity.other does not exist' }, 'excluded')).toBe(false);
    expect(isMissingColumnError({ code: 'PGRST205', message: 'excluded' }, 'excluded')).toBe(false);
    expect(isMissingColumnError(null, 'excluded')).toBe(false);
  });
});

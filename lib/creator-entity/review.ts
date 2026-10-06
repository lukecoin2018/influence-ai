/**
 * Tab, filter and bulk-accept logic for /admin/creator-review, kept out of the
 * page so it can be tested. Pure: no Supabase, no node imports — a 'use client'
 * page imports it.
 *
 * Filters are returned as data (TabFilter) rather than applied to a query
 * builder here, because supabase-js's builder generics don't survive a plain
 * function boundary; the page applies them to its own typed builder.
 *
 * The exclusion rule itself is NOT here. It lives in one place,
 * apply_creator_entity() in supabase/migrations/0027_creator_exclusion.sql,
 * and the page learns its outcome from creator_entity.excluded. The Review tab
 * below is built to be its complement: every unreviewed non-creator verdict
 * the rule does not hide lands here.
 */
import type { CreatorEntityType } from './types';

export type ReviewTab = 'review' | 'non_creators' | 'hidden' | 'all';
export type PlatformFilter = 'all' | 'instagram' | 'tiktok';

export const REVIEW_TABS: { value: ReviewTab; label: string }[] = [
  { value: 'review', label: 'Review' },
  { value: 'non_creators', label: 'Non-creators' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'all', label: 'All' },
];

export const PLATFORM_FILTERS: { value: PlatformFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
];

/**
 * Unreviewed rows (reviewed_at is null) that need a human — any of:
 *  R1 medium or low confidence, whatever the verdict;
 *  R2 entity_type 'other' — the rule never hides 'other' unreviewed;
 *  R3 a creator verdict with 2+ non-creator flags;
 *  R4 a non-creator verdict with no non-creator flag (flag_count = 0). The
 *     rule needs flag_count > 0, so these wait here; an IG business account
 *     alone is not support;
 *  R5 a creator verdict on a handle brand_aliases knows as a brand, media or
 *     venue (@gymsharkwomen: the AI summary called it a creator);
 *  R6 a claimed account with a non-creator verdict — the rule never hides a
 *     claimed account unreviewed, so without this a backed, high-confidence
 *     verdict on one (@lmgmedia1) would sit in neither set.
 */
export function reviewFilter(claimedIds: readonly string[]): string {
  const reasons = [
    'confidence.in.(medium,low)',
    'entity_type.eq.other',
    'and(entity_type.eq.creator,flag_count.gte.2)',
    'and(entity_type.neq.creator,flag_count.eq.0)',
    'and(entity_type.eq.creator,signals->>alias_match.eq.true)',
  ];
  if (claimedIds.length > 0) reasons.push(`and(entity_type.neq.creator,creator_id.in.(${claimedIds.join(',')}))`);
  return reasons.join(',');
}

/** Effective type is not 'creator': an override other than creator, or no override and a non-creator verdict. */
export const NON_CREATOR_FILTER = 'review_entity_type.neq.creator,and(review_entity_type.is.null,entity_type.neq.creator)';

/** What one tab's query filters on. `platform` applies to every tab and every count. */
export type TabFilter = {
  /** inputs->>platform equals this, or null for all platforms. */
  platform: 'instagram' | 'tiktok' | null;
  /** reviewed_at is null. */
  unreviewedOnly: boolean;
  /** A PostgREST or() expression, or null. */
  or: string | null;
  /** excluded = true (0027). */
  excludedOnly: boolean;
};

export function tabFilter(tab: ReviewTab, options: { platform: PlatformFilter; claimedIds: readonly string[] }): TabFilter {
  const platform = options.platform === 'all' ? null : options.platform;
  if (tab === 'review') return { platform, unreviewedOnly: true, or: reviewFilter(options.claimedIds), excludedOnly: false };
  if (tab === 'non_creators') return { platform, unreviewedOnly: false, or: NON_CREATOR_FILTER, excludedOnly: false };
  if (tab === 'hidden') return { platform, unreviewedOnly: false, or: null, excludedOnly: true };
  return { platform, unreviewedOnly: false, or: null, excludedOnly: false };
}

type AcceptCandidate = { creator_id: string; entity_type: CreatorEntityType; reviewed_at: string | null };

/**
 * The rows "Accept all on this page" sends to accept_creator_entity(): the
 * unreviewed ones, minus claimed accounts, which are reviewed one at a time.
 * accept_creator_entity() skips claimed rows too; this keeps the confirm
 * dialog's numbers honest.
 */
export function acceptableRows<T extends AcceptCandidate>(rows: readonly T[], claimed: ReadonlySet<string>): T[] {
  return rows.filter((row) => row.reviewed_at == null && !claimed.has(row.creator_id));
}

/**
 * True when setting this override on a claimed account would hide it: a
 * reviewed non-creator type is hidden whether or not the account is claimed.
 * The page asks for confirmation first. Clearing (null) or choosing creator
 * never hides.
 */
export function overrideHidesClaimed(creatorId: string, value: CreatorEntityType | null, claimed: ReadonlySet<string>): boolean {
  return value != null && value !== 'creator' && claimed.has(creatorId);
}

/**
 * Error codes for a filter on a column PostgREST does not know — here,
 * creator_entity.excluded before 0027 is applied. The page then hides the
 * Hidden tab's count instead of failing the whole load. Needs a GET: a
 * `head: true` request's error has no code or message to match.
 */
export function isMissingColumnError(error: { code?: string; message?: string } | null | undefined, column: string): boolean {
  if (!error) return false;
  return (error.code === '42703' || error.code === 'PGRST204') && (error.message ?? '').includes(column);
}

/**
 * Shared types and constants for the creator entity classification
 * (lib/creator-entity/*, supabase/migrations/0026_creator_entity.sql).
 *
 * Pure: no node imports and no Supabase, so the admin review page (a client
 * component) imports from here too. Everything that needs node:crypto or the
 * Anthropic SDK lives in classify.ts.
 */

export const CREATOR_ENTITY_TYPES = ['creator', 'brand', 'media', 'venue', 'other'] as const;
export type CreatorEntityType = (typeof CREATOR_ENTITY_TYPES)[number];

export const CREATOR_ENTITY_CONFIDENCES = ['high', 'medium', 'low'] as const;
export type CreatorEntityConfidence = (typeof CREATOR_ENTITY_CONFIDENCES)[number];

/**
 * Heuristic flags that point AWAY from a personal creator account. flag_count
 * is how many of these are true. No flag decides anything on its own; they are
 * stored next to the model's verdict so a human can see where the two
 * disagree.
 */
export const NON_CREATOR_FLAGS = [
  'business_category',
  'summary_self_description',
  'summary_official',
  'handle_suffix',
  'display_name_suffix',
  'domain_matches_name',
  'alias_match',
] as const;
export type NonCreatorFlag = (typeof NON_CREATOR_FLAGS)[number];

/**
 * Every flag in `signals`, in display order. ig_business is recorded but not
 * counted (many creators run business accounts for the analytics), and
 * creator_category points the other way.
 */
export const SIGNAL_FLAGS = ['ig_business', ...NON_CREATOR_FLAGS, 'creator_category'] as const;
export type SignalFlag = (typeof SIGNAL_FLAGS)[number];

/** creator_entity.signals: one boolean per flag, plus the text each true flag matched. */
export type CreatorEntitySignals = Record<SignalFlag, boolean> & {
  matches: Partial<Record<SignalFlag, string>>;
};

/**
 * creator_entity.inputs: the exact record sent to the model, and what
 * input_hash is computed over. follower_count is a JSON number so the review
 * page's jsonb sort is numeric. The 11 creators with no social profile have
 * nulls everywhere except display_name.
 */
export type CreatorEntityInputs = {
  platform: string | null;
  handle: string | null;
  display_name: string | null;
  follower_count: number | null;
  bio: string | null;
  category: string | null;
  is_business_account: boolean | null;
  link_domain: string | null;
  summary: string | null;
};

/**
 * One row returned by apply_creator_entity() and accept_creator_entity()
 * (migration 0027): a creator whose status would change (dry run) or did.
 * Only ever 'active' <-> 'non_creator'.
 */
export type CreatorEntityStatusChange = { creator_id: string; from_status: string; to_status: string };

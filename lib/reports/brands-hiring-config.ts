/**
 * Seam for a future gating layer on the creator-facing "Brands Hiring" list
 * (token cost, or a free-top-N / paid-full split) — v1 ships fully open.
 * Flip BRANDS_HIRING_GATING_ENABLED and slice the (already-ranked) list at
 * BRANDS_HIRING_FREE_TIER_LIMIT to gate later, without touching list/filter
 * rendering logic. useCreatorTokenGate (hooks/useCreatorTokenGate.ts) is the
 * existing mechanism for the "paid unlock" half of that, when it's built.
 */
export const BRANDS_HIRING_GATING_ENABLED = false;
export const BRANDS_HIRING_FREE_TIER_LIMIT = 10;

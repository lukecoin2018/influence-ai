import 'server-only';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Authorization gate for the API routes that return creator data.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * The creator database is the asset. Before this, nothing checked whether a
 * caller was entitled to it:
 *
 *   /api/match     no authentication at all. Anonymous callers got ranked
 *                  creators — handles, follower counts, engagement rates,
 *                  enrichment — and spent an OpenAI and an Anthropic call per
 *                  request. The 20-token charge lives in the *page*
 *                  (app/match/page.tsx:207), so calling the route directly
 *                  also skipped billing entirely.
 *
 *   /api/creators  required a session and nothing else. Its brand_profiles
 *                  lookup was billing-only, and said so: an account with no
 *                  brand_profiles row read the whole directory with
 *                  `tokenInfo` null — authenticated, unmetered, unapproved.
 *                  Brand signup has been failing for months and leaving auth
 *                  users behind with no profile row, so that was not a
 *                  hypothetical class of account.
 *
 * ── THE RULE ───────────────────────────────────────────────────────────────
 *
 * Approved brands only, checked as `approval_status === 'approved'`.
 *
 * Explicitly a positive check, never `!== 'suspended'`. Every other value —
 * 'pending', 'rejected', a typo, a status added later, and NULL — denies. The
 * column is applied out of band (brand_profiles is defined directly in
 * Supabase, not in this repo), so code reading it must treat absent and NULL
 * as "not approved" rather than as "no opinion". Approval is something a human
 * grants; the absence of that act is not consent.
 *
 * ── ERROR SHAPE ────────────────────────────────────────────────────────────
 *
 * Every denial carries a machine-readable `reason`, and the client maps that
 * to its own localized string. The prose here is English and is not for
 * display — same contract as the claim and verify routes.
 */

/** Distinguishes the denials so a caller can tell a pending brand from a stranger. */
export type BrandGateReason =
  | 'auth_unavailable'
  | 'auth_required'
  | 'brand_profile_missing'
  | 'brand_not_approved';

export type BrandGateResult =
  | { error: NextResponse }
  | { userId: string; brandId: string };

/**
 * Resolves the caller to an approved brand, or to the response to return.
 *
 * Shaped as a discriminated union rather than throwing, mirroring requireAdmin()
 * in app/api/admin/targeting/route.ts, so each call site stays a two-line early
 * return and the type checker enforces that the error branch is handled.
 */
export async function requireApprovedBrand(): Promise<BrandGateResult> {
  // Failing CLOSED is the point, and the 503 is deliberate. If auth is
  // unreachable we cannot tell whether this caller has a session, so we serve
  // nobody — but we say "unavailable" rather than "unauthorized", so a client
  // does not bounce a still-valid session to the login page over a transient
  // fault. Lifted from the handling already proven in app/api/creators/route.ts.
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  let user;
  try {
    supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Auth check unavailable', reason: 'auth_unavailable' satisfies BrandGateReason },
        { status: 503 },
      ),
    };
  }

  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized', reason: 'auth_required' satisfies BrandGateReason },
        { status: 401 },
      ),
    };
  }

  // Read through the caller's own client, not the service-role one: RLS on
  // brand_profiles then applies as a second opinion, and this query cannot be
  // talked into returning a row that belongs to somebody else.
  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('id, approval_status')
    .eq('id', user.id)
    .maybeSingle();

  // No row at all. This is the state every failed brand signup leaves behind,
  // and it used to mean unmetered access.
  if (!brand) {
    return {
      error: NextResponse.json(
        { error: 'No brand profile', reason: 'brand_profile_missing' satisfies BrandGateReason },
        { status: 403 },
      ),
    };
  }

  if (brand.approval_status !== 'approved') {
    return {
      error: NextResponse.json(
        { error: 'Brand not approved', reason: 'brand_not_approved' satisfies BrandGateReason },
        { status: 403 },
      ),
    };
  }

  return { userId: user.id, brandId: brand.id };
}

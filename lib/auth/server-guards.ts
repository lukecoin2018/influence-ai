import 'server-only';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getAdminAccess } from '@/lib/auth/admin-access';

/**
 * Server-side route gates for /admin/*, /dashboard/* and /creator-dashboard/*.
 *
 * ── WHY THESE EXIST ────────────────────────────────────────────────────────
 *
 * Before this file, both trees were guarded client-side only. Worse than it
 * sounds: 9 of 11 admin routes and 13 of 14 dashboard routes prerendered as
 * static HTML at build time, so an anonymous request to /admin/brands was
 * answered from a static file with `Cache-Control: s-maxage=31536000` — a
 * one-year shared-cache directive on an admin page. The body carried the whole
 * admin nav and every JS chunk; only the page's *data* was withheld, and only
 * because Supabase's RLS refused the anon key.
 *
 * Calling either of these from a layout reads cookies(), which de-opts the
 * whole subtree to `ƒ (Dynamic)`. That is not a side effect to work around —
 * it is half the fix. A dynamic app page emits
 * `private, no-cache, no-store, max-age=0, must-revalidate` from Next itself,
 * which is exactly what the VPS's nginx needs to see (it keys on
 * `$scheme://$host$request_uri` with no cookie, and stores any 200 for 60m).
 *
 * ── WHY getUser() AND NOT getSession() ─────────────────────────────────────
 *
 * getSession() returns whatever the cookie claims without verifying it against
 * the auth server. These functions decide whether a request may see the admin
 * surface, so the token gets validated. Same reasoning as
 * hasValidatedSession() in lib/supabase-server.ts.
 */

/**
 * Requires any authenticated user, with no role or approval check.
 *
 * No longer used by /dashboard, which now calls getBrandAccessState() below.
 * Kept as the plain session primitive for any future surface that wants one.
 */
export async function requireSession(): Promise<{ userId: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return { userId: user.id };
}

/**
 * Server gate for /creator-dashboard/*.
 *
 * Session only — deliberately NOT a claim_status check. The client shell
 * (app/creator-dashboard/_CreatorDashboardChrome.tsx) renders the locked
 * screen for 'pending' and 'rejected' over the page, and the API routes
 * refuse anything but 'verified' on their own. This gate's two jobs are the
 * ones only a server layout can do:
 *
 *   1. An anonymous request gets a redirect, never the dashboard HTML.
 *   2. Reading cookies() here de-opts the whole creator tree to ƒ (Dynamic).
 *      Until this existed the tree prerendered as static HTML — /creator-
 *      dashboard, /brands-hiring, /calculator, /contract, /edit and their
 *      .rsc twins were all in prerender-manifest.json — and Next served them
 *      with `s-maxage=31536000`, which the VPS's nginx honours over its own
 *      60m default. Dynamic pages emit `private, no-cache, no-store` instead.
 *      That header change is the fix for the cache; the redirect is a bonus.
 *
 * Redirects with ?redirectTo=, which is the parameter app/login/page.tsx:34
 * reads and middleware.ts:73 sets. A layout has no access to the request path,
 * so the tree root is used; middleware already carries the exact path for the
 * common case.
 *
 * Vercel note: this turns the creator pages from static files into a function
 * call per request. Intended — a per-user dashboard has no business being
 * static — and recorded here so it is not "fixed" back later.
 */
export async function requireCreatorSession(): Promise<{ userId: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=%2Fcreator-dashboard');

  return { userId: user.id };
}

/**
 * What the brand dashboard should show this caller.
 *
 *   approved    render the dashboard
 *   pending     awaiting review — the normal state for every new brand
 *   no_profile  signed in, but no brand_profiles row exists at all
 *   blocked     a row exists and its status is not one a brand can use
 *
 * `pending` and `no_profile` are separate values on purpose even though both
 * render the same holding page. They mean different things operationally — one
 * is a brand waiting in the queue, the other is an account that never got a row
 * written, which is the state ~18 failed signups left behind before this branch
 * — and collapsing them here would make that invisible to a future reader.
 *
 * Anything that is not exactly 'approved' or 'pending' is `blocked`, including
 * 'rejected', 'suspended', a typo and NULL. Same positive-check reasoning as
 * requireApprovedBrand() in lib/auth/api-guards.ts: approval is something a
 * human grants, and the absence of that act is not consent.
 *
 * Redirects when there is no session at all — that is a login problem, not a
 * status to render.
 */
export type BrandAccessState = 'approved' | 'pending' | 'no_profile' | 'blocked';

export async function getBrandAccessState(): Promise<{ userId: string; state: BrandAccessState }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('approval_status')
    .eq('id', user.id)
    .maybeSingle();

  if (!brand) return { userId: user.id, state: 'no_profile' };
  if (brand.approval_status === 'approved') return { userId: user.id, state: 'approved' };
  if (brand.approval_status === 'pending') return { userId: user.id, state: 'pending' };

  return { userId: user.id, state: 'blocked' };
}

/**
 * Requires an admin: the owner or an active additional admin, decided by
 * getAdminAccess() in lib/auth/admin-access.ts. For server pages that fetch
 * data themselves (the creator preview pages).
 *
 *   signed out          -> /login
 *   not an admin        -> /  (sent home, not to a login form they have
 *                              already satisfied)
 *   paused, unverified  -> /admin, where the layout explains which
 *
 * The /admin layout gates too, but a page must not rely on it: Next does not
 * re-run a layout on client-side navigation, and a layout that swaps its
 * children for another screen does not stop the page underneath from running.
 */
export async function requireAdmin(): Promise<{ userId: string; isOwner: boolean }> {
  const access = await getAdminAccess();
  switch (access.kind) {
    case 'owner':
      return { userId: access.userId, isOwner: true };
    case 'admin':
      return { userId: access.userId, isOwner: false };
    case 'anonymous':
      return redirect('/login');
    case 'none':
      return redirect('/');
    default:
      return redirect('/admin');
  }
}

/**
 * Requires the owner account (ADMIN_USER_ID). For /admin/admins, the one page
 * an additional admin may not open. Decided without any database lookup.
 *
 *   signed out                          -> /login
 *   an additional admin, active or not  -> /admin
 *   anyone else                         -> /
 */
export async function requireOwner(): Promise<{ userId: string }> {
  const access = await getAdminAccess();
  switch (access.kind) {
    case 'owner':
      return { userId: access.userId };
    case 'anonymous':
      return redirect('/login');
    case 'none':
      return redirect('/');
    default:
      return redirect('/admin');
  }
}

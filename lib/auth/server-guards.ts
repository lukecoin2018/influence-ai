import 'server-only';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

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
 * The single owner account permitted into /admin/*.
 *
 * Admin here is exactly one account and no role system is planned, so the
 * identity lives in a server-only env var rather than in a table. Deliberately
 * NOT read from `user_roles`: that table is written from the browser with the
 * anon key (app/auth/signup/_SignUpForm.tsx:142), and until 2026-08-12 its
 * INSERT policy did not pin `role`, so a signup could in principle have written
 * itself `admin`. The policy is patched, but "admin is a value in a table the
 * client can insert into" is the wrong shape for a single-owner surface.
 *
 * `user_roles` is untouched by this file and still matters: Postgres depends on
 * it. is_admin_user() backs the RLS policies on brand_aliases (0001:53-62) and
 * brand_reports (0004), and 0015's trigger exempts admins through a user_roles
 * subquery. This changes what the *application* trusts, not what the database
 * trusts.
 *
 * Must never be NEXT_PUBLIC_ — that would inline the owner's user id into the
 * client bundle for anyone to read. Verified it does not leak today: a build
 * carrying a known test value had zero occurrences of it under .next/static.
 *
 * ── IT MUST BE SET AT BUILD TIME, NOT ONLY AT RUNTIME ──────────────────────
 *
 * Measured on this Next version, both directions, on isolated ports:
 *
 *   built WITHOUT the var, started WITH it   -> undefined
 *                                               ('ADMIN_USER_ID' is not even a
 *                                               key in process.env)
 *   built WITH the var, started WITHOUT it   -> resolves fine
 *
 * So the value is captured when `next build` runs. Setting it afterwards in a
 * runtime-only environment does nothing to a build that already exists. This
 * cost a real debugging round trip: an admin logged in successfully and landed
 * back on the front page, because the deployment under test had been built
 * before the variable existed.
 *
 *   Vercel — set it for the environment that BUILDS the deployment, and
 *            redeploy. A branch push builds a Preview deployment, which has its
 *            own environment; setting it on Production only will not reach it.
 *   VPS    — put it in .env.local, which Next reads at build and at start. The
 *            deploy chain runs `npm run build` after `git pull`, so a value in
 *            that file is in scope. Setting it only in the Webuzo panel as a
 *            runtime variable is NOT.
 *
 * The fragility is deliberate in its direction: a build missing the variable
 * denies everyone, attacker included. It costs availability, not security, and
 * fail-closed is the right way for an auth gate to break.
 */
const ADMIN_USER_ID_ENV = 'ADMIN_USER_ID';

/**
 * First 8 characters, for logs. Enough to compare two ids at a glance without
 * writing full user ids into a log file that is less protected than the
 * database they came from.
 */
function idHint(id: string): string {
  return `${id.slice(0, 8)}…`;
}

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
 * Requires the owner account. Redirects to /login when there is no session at
 * all, and to / when someone is signed in but is not the owner — the same
 * split requireAdminPreviewAccess() uses
 * (app/admin/preview/creator/[handle]/_data.ts:37-42), so a logged-in
 * non-owner is sent home rather than bounced to a login form they have already
 * satisfied.
 */
export async function requireOwner(): Promise<{ userId: string }> {
  // Read through the literal `process.env.ADMIN_USER_ID`, not a computed key.
  // Both resolve identically here (measured), but the literal is the form Next
  // documents and statically analyses, so it stays correct if this file is ever
  // bundled for a runtime that does not expose a live process.env.
  const ownerId = process.env.ADMIN_USER_ID?.trim();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Unconfigured denies everyone, including the owner. "Env var missing" must
  // never widen access: if this fell through to allow-all, forgetting to set
  // ADMIN_USER_ID on a new host would silently reopen the exact hole this file
  // closes. Deny is the recoverable direction.
  //
  // Checked after getUser() rather than before so that a misconfigured host
  // sends an anonymous visitor to /login and a signed-in one to /, instead of
  // revealing "this deploy has no admin configured" to logged-out traffic.
  if (!ownerId) {
    console.error(
      `[admin-gate] ${ADMIN_USER_ID_ENV} is unset or empty — denying all access ` +
      'to /admin, including the owner. It is captured at BUILD time: set it and ' +
      'rebuild (Vercel: redeploy; VPS: add it to .env.local before npm run build).',
    );
    redirect('/');
  }

  // Case-insensitive: these are hex UUIDs, so an uppercase paste is the same
  // id. Comparing raw would reject a correct value on nothing but letter case
  // and land the owner on the front page with no clue why.
  if (user.id.toLowerCase() !== ownerId.toLowerCase()) {
    // Logged so this is distinguishable from the unset case above. Both
    // redirect to / — without this line the two look identical from the
    // outside, which is exactly how the first lockout went undiagnosed.
    console.error(
      `[admin-gate] signed-in user ${idHint(user.id)} does not match ` +
      `${ADMIN_USER_ID_ENV} ${idHint(ownerId)} — denying /admin.`,
    );
    redirect('/');
  }

  return { userId: user.id };
}

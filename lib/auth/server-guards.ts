import 'server-only';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Server-side route gates for /admin/* and /dashboard/*.
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
 * client bundle for anyone to read.
 */
const ADMIN_USER_ID_ENV = 'ADMIN_USER_ID';

/**
 * Requires any authenticated user. No role check and no approval_status check:
 * brand signup does not work yet (it writes a `status` column that does not
 * exist on brand_profiles), so gating on approval here would lock out every
 * account including the ones that do work. Approval gating is a later branch.
 */
export async function requireSession(): Promise<{ userId: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return { userId: user.id };
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
  const ownerId = process.env[ADMIN_USER_ID_ENV]?.trim();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Unconfigured denies everyone, including the owner. "Env var missing" must
  // never widen access: if this fell through to allow-all, forgetting to set
  // ADMIN_USER_ID on a new host would silently reopen the exact hole this file
  // closes. Deny is the recoverable direction — the owner sets the var and
  // restarts; the alternative is an open admin panel nobody notices.
  //
  // Checked after getUser() rather than before so that a misconfigured host
  // sends an anonymous visitor to /login and a signed-in one to /, instead of
  // revealing "this deploy has no admin configured" to logged-out traffic.
  if (!ownerId) {
    console.error(
      `${ADMIN_USER_ID_ENV} is unset or empty — denying all access to /admin. ` +
      'Set it to the owner\'s auth user id and restart.',
    );
    redirect('/');
  }

  if (user.id !== ownerId) redirect('/');

  return { userId: user.id };
}

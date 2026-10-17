import 'server-only';
import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { withTimeout } from '@/lib/withTimeout';

/**
 * Who may use /admin, decided in one place. Every server-side admin check —
 * the /admin layout, the preview pages, every /api/admin/* route — goes
 * through getAdminAccess(), directly or through the wrappers in
 * server-guards.ts (pages) and api-guards.ts (routes). Nothing else reads
 * ADMIN_USER_ID or decides admin from user_roles.
 *
 * ── TWO KINDS OF ADMIN ─────────────────────────────────────────────────────
 *
 *   owner   the account in ADMIN_USER_ID. Decided before any database
 *           lookup, so the owner gets in whether admin_users exists, is
 *           empty, errors or times out. Only the owner can open
 *           /admin/admins and manage the others.
 *
 *   admin   an additional admin: an admin_users row with status 'active'
 *           (migration 0032), read with the service-role key because that
 *           table has no policies. A failed or slow lookup denies (fail
 *           closed). Same powers as the owner everywhere else.
 *
 * The database has its own check, is_admin_user(), which also reads
 * admin_users since 0032, so a blocked admin's browser reads and writes stop
 * on their next query too. This file decides what the app serves; that one
 * decides what Postgres returns. A block must reach both, and does.
 *
 * ── ADMIN_USER_ID ──────────────────────────────────────────────────────────
 *
 * Server-only. Must never be NEXT_PUBLIC_: that would put the owner's user id
 * in the client bundle (a build with a known test value had zero occurrences
 * of it under .next/static). The admin layout passes the browser a boolean,
 * isOwner, never the id.
 *
 * Captured at BUILD time, not only at runtime. Measured on this Next version,
 * on isolated ports: built without the var and started with it, it is
 * undefined; built with it and started without it, it resolves. So it must
 * be in the environment that builds: on Vercel, the environment of the
 * deployment being built (a Preview has its own); on the VPS, .env.local,
 * which deploy/vps-deploy.sh copies into each build. An admin who logs in
 * and lands on the front page is the symptom of a build made without it.
 *
 * Unset or empty denies everyone, the owner and additional admins included.
 * "Unconfigured" must never widen access, and a deploy with no owner is
 * misconfigured in a way someone needs to see. Deny is the recoverable
 * direction.
 *
 * Read through the literal `process.env.ADMIN_USER_ID`, not a computed key:
 * the literal is the form Next documents and statically analyses.
 */

export type AdminAccess =
  | { kind: 'owner'; userId: string }
  | { kind: 'admin'; userId: string }
  /** An additional admin the owner has blocked. */
  | { kind: 'paused'; userId: string }
  /** Signed in, but neither the owner nor an additional admin. */
  | { kind: 'none'; userId: string }
  | { kind: 'anonymous' }
  /**
   * Could not decide, so denied: the auth server was unreachable, or (for
   * anyone but the owner) the admin_users lookup failed or timed out.
   */
  | { kind: 'unverified'; reason: 'auth_unavailable' | 'admin_check_unavailable' };

/** One admin_users lookup: the row's status, null for no row, or why it failed. */
export type AdminRowLookup = { status: string | null } | { error: string };

export interface AdminAccessDeps {
  ownerId: string | undefined;
  /** The validated session's user id, null when signed out. Throws when auth is unreachable. */
  getUserId: () => Promise<string | null>;
  lookupAdminRow: (userId: string) => Promise<AdminRowLookup>;
}

/** The admin_users lookup gets this long; a slower answer denies. */
export const ADMIN_LOOKUP_TIMEOUT_MS = 5_000;

/**
 * First 8 characters, for logs. Enough to compare two ids at a glance without
 * writing full user ids into a log file that is less protected than the
 * database they came from.
 */
function idHint(id: string): string {
  return `${id.slice(0, 8)}…`;
}

/**
 * The decision itself, with its inputs passed in so it can be tested without
 * a session or a database. getAdminAccess() below is this with the real ones.
 */
export async function resolveAdminAccess(deps: AdminAccessDeps): Promise<AdminAccess> {
  let userId: string | null;
  try {
    userId = await deps.getUserId();
  } catch {
    return { kind: 'unverified', reason: 'auth_unavailable' };
  }
  if (!userId) return { kind: 'anonymous' };

  // Checked after the session rather than before, so a misconfigured host
  // sends an anonymous visitor to /login and a signed-in one to /, instead of
  // telling logged-out traffic that this deploy has no admin configured.
  const ownerId = deps.ownerId?.trim();
  if (!ownerId) {
    console.error(
      '[admin-gate] ADMIN_USER_ID is unset or empty — denying all admin access, including the ' +
      'owner. It is captured at BUILD time: set it and rebuild (Vercel: redeploy; VPS: add it to ' +
      '.env.local and run deploy/vps-deploy.sh).',
    );
    return { kind: 'none', userId };
  }

  // Case-insensitive: these are hex UUIDs, so an uppercase paste is the same
  // id. Comparing raw would turn the owner away over letter case alone.
  if (userId.toLowerCase() === ownerId.toLowerCase()) return { kind: 'owner', userId };

  let row: AdminRowLookup;
  try {
    row = await deps.lookupAdminRow(userId);
  } catch (e) {
    row = { error: e instanceof Error ? e.message : String(e) };
  }

  if ('error' in row) {
    console.error(`[admin-gate] admin_users lookup failed for ${idHint(userId)}, denying: ${row.error}`);
    return { kind: 'unverified', reason: 'admin_check_unavailable' };
  }

  if (row.status === null) {
    // Logged so a lockout is diagnosable: without this line, "not an admin"
    // and "admin but the build has the wrong ADMIN_USER_ID" look identical
    // from the outside, which is how the first owner lockout went unexplained.
    console.error(
      `[admin-gate] signed-in user ${idHint(userId)} is neither ADMIN_USER_ID ${idHint(ownerId)} ` +
      'nor an additional admin — denying.',
    );
    return { kind: 'none', userId };
  }

  // A positive check: only 'active' admits. 'blocked', and any value a
  // future migration might add, is a pause until a human says otherwise.
  if (row.status === 'active') return { kind: 'admin', userId };

  console.warn(`[admin-gate] additional admin ${idHint(userId)} is ${row.status} — denying.`);
  return { kind: 'paused', userId };
}

async function lookupAdminRow(userId: string): Promise<AdminRowLookup> {
  const { data, error } = await withTimeout(
    Promise.resolve(
      createSupabaseAdminClient().from('admin_users').select('status').eq('user_id', userId).maybeSingle(),
    ),
    ADMIN_LOOKUP_TIMEOUT_MS,
  );
  // Before 0032 is applied the table does not exist and this is an error, so
  // nobody but the owner gets in: the owner was decided above.
  if (error) return { error: error.message };
  return { status: (data as { status: string } | null)?.status ?? null };
}

/**
 * The caller's admin access for this request. Wrapped in React's cache() so
 * the layout and a page in the same render share one session check and one
 * lookup; route handlers run outside a render and simply call it.
 *
 * Uses getUser(), not getSession(): getSession() returns whatever the cookie
 * claims, unverified, and this decides who sees the admin surface.
 */
export const getAdminAccess = cache(async (): Promise<AdminAccess> =>
  resolveAdminAccess({
    ownerId: process.env.ADMIN_USER_ID,
    getUserId: async () => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    lookupAdminRow,
  }),
);

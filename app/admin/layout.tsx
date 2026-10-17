import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/auth/admin-access';
import AdminChrome from './_AdminChrome';
import AdminAccessScreen from './_AdminAccessScreen';

/**
 * Server gate for every /admin/* route: the owner or an active additional
 * admin, decided by getAdminAccess() (lib/auth/admin-access.ts).
 *
 *   signed out            -> /login
 *   not an admin          -> /
 *   blocked, or the check
 *   could not be made     -> a screen that says which, instead of the admin
 *   owner, active admin   -> the admin chrome; isOwner shows the Admins link
 *
 * A per-page guard was not an option for most pages: the admin pages are
 * 'use client' and cannot call a server function. This layout is the only
 * place above them that runs on the server.
 *
 * What this gate does NOT cover, and what does:
 *
 *  1. Next does not re-run a layout on client-side navigation. In a tab that
 *     is already open, moving between admin pages never comes back here. The
 *     pages' data does: they read through Supabase, where is_admin_user()
 *     (0032) refuses a blocked admin on their next query, and every
 *     /api/admin/* route checks requireAdminApi() per call. So a block stops
 *     the data at once and this screen appears on the next full load.
 *
 *  2. A layout that renders the access screen instead of its children does
 *     not stop the page underneath from running. Pages that fetch on the
 *     server check for themselves: /admin/preview/* (requireAdmin()) and
 *     /admin/admins (requireOwner()).
 *
 * Reading the session here de-opts the whole subtree from static
 * prerendering, which is intended: as ƒ (Dynamic) these routes are served
 * `private, no-store`, which keeps the VPS's URI-keyed nginx cache from
 * storing an admin page. /admin is also in the nginx cache bypass
 * (deploy/nginx/influenceit.app.custom.conf).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await getAdminAccess();

  if (access.kind === 'anonymous') redirect('/login');
  if (access.kind === 'none') redirect('/');
  if (access.kind === 'paused' || access.kind === 'unverified') {
    return <AdminAccessScreen state={access.kind} />;
  }

  return <AdminChrome isOwner={access.kind === 'owner'}>{children}</AdminChrome>;
}

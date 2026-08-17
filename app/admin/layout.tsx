import { requireOwner } from '@/lib/auth/server-guards';
import AdminChrome from './_AdminChrome';

/**
 * Server gate for every /admin/* route.
 *
 * The chrome and the client-side auth check that used to live in this file are
 * now in _AdminChrome.tsx, unchanged. What is new is that requireOwner() runs
 * here, on the server, before any of it renders — so an anonymous request gets
 * a redirect instead of the admin HTML.
 *
 * A per-page guard was not an option: all 9 gated admin pages are 'use client'
 * and cannot call a server function. This layout is the only place above them
 * that runs on the server.
 *
 * Two consequences worth knowing:
 *
 *  1. Reading cookies() de-opts this whole subtree from static prerendering.
 *     That is intended. These 9 routes previously built as ○ (Static) and were
 *     served with `Cache-Control: s-maxage=31536000`; as ƒ (Dynamic) they emit
 *     `private, no-store, ...` from Next itself, which is what keeps the VPS's
 *     URI-keyed nginx cache from storing an admin page.
 *
 *  2. /admin/preview/* is nested under this layout, so it now passes through
 *     requireOwner() *and* its own requireAdminPreviewAccess(). Both resolve to
 *     the same single account, so this double-gates rather than conflicting —
 *     the preview routes keep their user_roles check and gain the owner check.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireOwner();

  return <AdminChrome>{children}</AdminChrome>;
}

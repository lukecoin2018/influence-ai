import { requireSession } from '@/lib/auth/server-guards';
import DashboardChrome from './_DashboardChrome';

/**
 * Server gate for every /dashboard/* route — the brand dashboard.
 *
 * This tree had no auth check anywhere before: not in the layout, not in the
 * pages, and not in middleware, which guarded /find-creators and
 * /brand-dashboard instead — neither of which is a real route.
 *
 * Session only. No role check and no approval_status check, deliberately; see
 * requireSession() in lib/auth/server-guards.ts for why approval gating has to
 * wait for brand signup to work at all.
 *
 * As with the admin layout, a per-page guard was impossible — 12 of the 14
 * dashboard pages are 'use client', and the other two are three-line wrappers
 * around client components. Reading cookies() here de-opts the subtree to
 * dynamic, which is what replaces `s-maxage=31536000` with `private, no-store`
 * on 13 routes that were prerendering as static HTML.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  return <DashboardChrome>{children}</DashboardChrome>;
}

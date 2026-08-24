import { getBrandAccessState } from '@/lib/auth/server-guards';
import DashboardChrome from './_DashboardChrome';
import BrandGateScreen from './_BrandGateScreen';

/**
 * Server gate for every /dashboard/* route — the brand dashboard.
 *
 * Fail-closed by construction: `children` is only ever passed to the chrome on
 * the 'approved' branch. An unapproved brand does not get a dashboard with its
 * data hidden — it gets a different tree, in which no dashboard page component
 * mounts, no client-side fetch fires, and no sidebar renders. That matters
 * because all 14 pages below here are client components that load their own
 * data on mount; hiding them visually would still have run every one of those
 * queries.
 *
 * This is why the check lives here rather than in each page. A per-page guard
 * was never available — 12 of the 14 pages are 'use client' and cannot call a
 * server function — and a per-page guard is also the version that leaks the
 * first time somebody adds a page and forgets one.
 *
 * Pending is now the normal state for every new brand, not an error: signup
 * writes approval_status 'pending' and a person approves by hand. The screen
 * reflects that.
 *
 * The API routes are gated independently by requireApprovedBrand()
 * (lib/auth/api-guards.ts) and do not trust this layout. Two boundaries, on
 * purpose: this one decides what renders, that one decides what data moves.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { state } = await getBrandAccessState();

  if (state !== 'approved') {
    return <BrandGateScreen state={state} />;
  }

  return <DashboardChrome>{children}</DashboardChrome>;
}

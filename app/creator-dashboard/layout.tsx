import { requireCreatorSession } from '@/lib/auth/server-guards';
import { CreatorDashboardChrome } from './_CreatorDashboardChrome';

/**
 * Server gate for every /creator-dashboard/* route.
 *
 * The chrome and the client-side claim_status gate that used to live in this
 * file are now in _CreatorDashboardChrome.tsx, unchanged apart from the
 * 'rejected' lock. What is new is that requireCreatorSession() runs here, on
 * the server, before any of it renders — the same shape as app/admin/layout.tsx.
 *
 * Two consequences, both intended:
 *
 *  1. Reading cookies() de-opts this whole subtree from static prerendering.
 *     Every page under here was ○ (Static) — the built .next held
 *     creator-dashboard.html and the prerender manifest listed the tree — and
 *     was served with `Cache-Control: s-maxage=31536000`. The VPS's nginx keys
 *     its cache on URL alone and honours s-maxage, so a logged-in creator's
 *     request for the dashboard was a cache HIT on a year-old directive. As
 *     ƒ (Dynamic) the pages emit `private, no-store` from Next itself.
 *
 *  2. The creator tree finally has a server-side auth boundary. Only the
 *     session is checked here; pending/rejected stay a client overlay so the
 *     locked screen still renders, and the API routes enforce 'verified'.
 *
 * The admin preview (app/admin/preview/creator/[handle]) is NOT under this
 * layout — it lives under /admin with its own AdminPreviewShell — and is
 * unaffected.
 */
export default async function CreatorDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireCreatorSession();

  return <CreatorDashboardChrome>{children}</CreatorDashboardChrome>;
}

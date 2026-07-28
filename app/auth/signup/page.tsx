import { headers } from 'next/headers';
import { recordFunnelEvent } from '@/lib/funnel/events';
import SignUpForm from './_SignUpForm';

/**
 * Server wrapper around the signup form, existing for one reason: to capture
 * `signup_arrived` — the creator leaving the /claim/[handle] teaser and
 * landing here.
 *
 * Why a server wrapper rather than middleware. Middleware was the obvious
 * candidate (it already runs on this path, and sees the query string), and it
 * is the wrong tool here for a specific reason: this route used to be
 * statically prerendered, and a prerendered route reached by a client-side
 * <Link> can be served entirely from the App Router's client cache after a
 * prefetch, with no request to the server at all. Middleware would then never
 * run, and the arrival would go uncounted — an instrument that silently drops
 * an unknown fraction of the very number it exists to produce. `force-dynamic`
 * below is what fixes that: it stops the route being prefetched whole and
 * guarantees this component runs on every navigation. It is a deliberate
 * render-mode change, not a side effect. The route is a personalized auth form
 * that was already client-rendered below the Suspense boundary, so nothing
 * about it wanted to be static.
 *
 * The secondary reason is blast radius: middleware gates every request to the
 * site, and adding a service-role Supabase client to it to instrument one page
 * is a poor trade.
 *
 * `signup_arrived`, not `claim_clicked`: all four exits from the teaser
 * (app/claim/[handle]/_teaser.tsx lines 176, 279, 337-338, 389) point at this
 * same href, so nothing server-side can attribute an arrival to a particular
 * CTA. The event is named for what is actually observable.
 */
export const dynamic = 'force-dynamic';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const requestHeaders = await headers();

  // Only the creator claim funnel. This route also serves brand signup, which
  // is a different funnel entirely and would otherwise pad every number here.
  // Matches signupHref() in app/claim/[handle]/_teaser.tsx, which always emits
  // role=creator.
  if (first(params.role) === 'creator') {
    // A prefetch is not an arrival. Next's own router marks them with this
    // header (it is what Next itself keys `isPrefetchRequest` off), and
    // <Link> prefetches on hover and on entering the viewport — counting
    // those would inflate this event well above the real click-through.
    const isPrefetch = requestHeaders.get('next-router-prefetch') === '1';

    if (!isPrefetch) {
      recordFunnelEvent({
        eventType: 'signup_arrived',
        handle: first(params.handle),
        // No creator_id yet: the teaser resolved one, but it isn't carried in
        // the link. The handle is the join key for this half of the funnel.
        locale: normalizeLocale(first(params.locale)),
        userAgent: requestHeaders.get('user-agent'),
      });
    }
  }

  return <SignUpForm />;
}

/** A repeated query param arrives as an array; take the first and ignore the rest. */
function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Same rule as normalizeLocale() in _SignUpForm.tsx and in
 * app/api/creators/claim/route.ts — anything that isn't exactly 'es'
 * reads as 'en'. Untrusted URL input, and it must never be able to throw here.
 */
function normalizeLocale(raw: string | null): 'en' | 'es' {
  return raw === 'es' ? 'es' : 'en';
}

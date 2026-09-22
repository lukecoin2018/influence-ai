import type { Metadata } from 'next';
import { GetListedForm } from './_GetListedForm';
import { normalizeRequestHandle, normalizeSource } from '@/lib/creator-requests/shared';

/**
 * /get-listed — where a creator who is NOT in the database asks to be.
 *
 * Three entry points link here, each naming itself in `?from=`: the signup
 * form's handle-not-found line, the /claim/[handle] not-found page, and the
 * footer. Both funnel entry points also pass `?handle=`, so the field arrives
 * filled in with what the creator already typed.
 *
 * ── RENDER MODE ────────────────────────────────────────────────────────────
 *
 * Dynamic by construction: reading `searchParams` in a server component is
 * itself a de-opt, so no `dynamic` export is needed or added. Doing the read
 * HERE rather than with useSearchParams() in the form is the point — every
 * useSearchParams() call site in this repo sits inside a Suspense boundary
 * (CLAUDE.md, "Render modes"), and this way the form needs none and stays a
 * plain props-in component that can be embedded anywhere later.
 */

export const metadata: Metadata = {
  // No " | InfluenceIT" suffix here: app/layout.tsx sets a title TEMPLATE of
  // '%s | InfluenceIT', so writing it out produced "… | InfluenceIT |
  // InfluenceIT" in the tab.
  title: 'Ask us to add you',
  description:
    'Not in the InfluenceIT database yet? Tell us your Instagram handle. We review every request by hand.',
};

export default async function GetListedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  return (
    <GetListedForm
      // Normalized before it is shown, so the creator sees the handle that
      // would actually be stored rather than whatever the referring page
      // happened to put in the link.
      initialHandle={normalizeRequestHandle(first(params.handle)) ?? ''}
      source={normalizeSource(first(params.from))}
      locale={normalizeLocale(first(params.locale))}
    />
  );
}

/** A repeated query param arrives as an array; take the first and ignore the rest. */
function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Same rule as normalizeLocale() in app/auth/signup/page.tsx and in
 * app/api/creators/claim/route.ts — anything that isn't exactly 'es' reads as
 * 'en'. Untrusted URL input, and it must never be able to throw here.
 */
function normalizeLocale(raw: string | null): 'en' | 'es' {
  return raw === 'es' ? 'es' : 'en';
}

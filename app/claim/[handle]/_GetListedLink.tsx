'use client';

// app/claim/[handle]/_GetListedLink.tsx
//
// The "ask us to add you" button on the claim not-found page.
//
// ── WHY A CLIENT COMPONENT FOR ONE LINK ────────────────────────────────────
//
// Because not-found.tsx is the one page in the App Router that cannot see the
// route's params. Next renders it for the `/claim/[handle]` segment but passes
// it nothing, and ClaimNotFound (app/claim/[handle]/_teaser.tsx) receives only
// a locale — so the handle the creator just tried, which is sitting right
// there in the URL, is unreachable from the server side of this page.
//
// usePathname() can read it. Not useSearchParams(), which would need a
// Suspense boundary (CLAUDE.md, "Render modes"); the handle is a path segment,
// and usePathname carries no such requirement. The route is force-dynamic
// anyway, so nothing here changes a render mode.
//
// If the pathname somehow does not yield a handle, the link still works — it
// just arrives at /get-listed with an empty field, which is the footer's
// behaviour and is fine.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from './_strings';

/**
 * Last path segment of `/claim/<handle>` or `/es/claim/<handle>`, decoded.
 * Returns '' rather than throwing on anything unexpected: a decorative
 * pre-fill must never be able to break the error page it sits on.
 */
function handleFromPath(pathname: string): string {
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  if (last === 'claim') return '';
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

export function GetListedLink({ locale, label }: { locale: Locale; label: string }) {
  const params = new URLSearchParams({ from: 'claim_not_found', locale });
  const handle = handleFromPath(usePathname() ?? '');
  if (handle) params.set('handle', handle);

  return (
    <Link
      href={`/get-listed?${params.toString()}`}
      style={{
        display: 'inline-flex', padding: '10px 20px', borderRadius: '8px',
        backgroundColor: 'var(--color-lmg-yellow)', color: 'var(--color-lmg-grey)',
        fontSize: '14px', fontWeight: 600, textDecoration: 'none',
      }}
    >
      {label}
    </Link>
  );
}

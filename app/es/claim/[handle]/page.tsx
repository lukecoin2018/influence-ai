import { ClaimTeaser } from '@/app/claim/[handle]/_teaser';

// This route works for ANY creator handle on demand — always fetch fresh,
// never statically prerender or cache a specific creator's page. Mirrors
// app/claim/[handle]/page.tsx exactly, just locale="es" — same shared
// implementation, no forked copy.
export const dynamic = 'force-dynamic';

export default async function EsClaimHandlePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <ClaimTeaser handle={handle} locale="es" />;
}

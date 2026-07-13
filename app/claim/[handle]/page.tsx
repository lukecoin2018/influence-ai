import { ClaimTeaser } from './_teaser';

// This route works for ANY creator handle on demand — always fetch fresh,
// never statically prerender or cache a specific creator's page.
export const dynamic = 'force-dynamic';

export default async function ClaimHandlePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <ClaimTeaser handle={handle} locale="en" />;
}

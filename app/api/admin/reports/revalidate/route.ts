import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminApi } from '@/lib/auth/api-guards';
import { withNoStore } from '@/lib/http/no-store';

// /report/[slug] is ISR-cached (revalidate = 60s, see that page) so a
// bursty spike of visits to the same report doesn't recompute Tier 1/2/3
// from creator_posts on every single request. Admin-only and gated on
// purpose: without an auth check, this endpoint would itself be a way to
// force constant regeneration — the exact load pattern the cache exists to
// avoid.
export const POST = withNoStore(handlePOST);

async function handlePOST(req: NextRequest) {
  const auth = await requireAdminApi();
  if ('error' in auth) return auth.error;

  try {
    const { slug } = await req.json();
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    revalidatePath(`/report/${slug}`);
    return NextResponse.json({ revalidated: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to revalidate' }, { status: 500 });
  }
}

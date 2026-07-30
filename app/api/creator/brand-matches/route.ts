import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { withTimeout, TimeoutError } from '@/lib/withTimeout';
import { getCreatorBrandMatches } from '@/lib/reports/creator-brand-matches';
import { withNoStore } from '@/lib/http/no-store';

const READ_TIMEOUT_MS = 15_000;

// The caller's own brand matches only — resolved from their own session, not
// an arbitrary id in the request. getCreatorBrandMatches needs a
// service-role client regardless of whose data (brand_brackets has RLS with
// no policies), so this bridges the client-side dashboard's anon-key session
// to that service-role read, the same way app/claim/[handle]/page.tsx (a
// server component) calls it directly.
// This response is per-creator, so it must never be stored by a shared cache.
// It was: Webuzo's nginx keys on URI alone, and this URL has no per-user part,
// so a headerless 200 was replayed to every session for an hour. See
// lib/http/no-store.ts.
export const GET = withNoStore(handleGET);

async function handleGET() {
  const session = await createSupabaseServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await session.from('creator_profiles').select('creator_id').eq('id', user.id).maybeSingle();
  if (!profile?.creator_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createSupabaseAdminClient();

  try {
    const [result, socialRow] = await Promise.all([
      withTimeout(getCreatorBrandMatches(admin, profile.creator_id), READ_TIMEOUT_MS),
      withTimeout(
        Promise.resolve(admin.from('social_profiles').select('detected_niche').eq('creator_id', profile.creator_id).limit(1).maybeSingle()),
        READ_TIMEOUT_MS,
      ),
    ]);

    return NextResponse.json({
      // creatorId keeps the null-result fallback structurally identical to a
      // real CreatorBrandMatches — which is how both dashboard callers type
      // this response. profile.creator_id is non-null here (the 403 above
      // guarantees it), so the shape holds on every branch.
      ...(result ?? { creatorId: profile.creator_id, creatorFollowers: null, totalMatchCount: 0, matches: [], strongestMatch: null, teaserPreview: [] }),
      detectedNiche: socialRow.data?.detected_niche ?? null,
    });
  } catch (err) {
    if (err instanceof TimeoutError) return NextResponse.json({ error: 'Timed out' }, { status: 504 });
    throw err;
  }
}

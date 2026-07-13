import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { withTimeout, TimeoutError } from '@/lib/withTimeout';
import { getCreatorBrandMatches } from '@/lib/reports/creator-brand-matches';

const READ_TIMEOUT_MS = 15_000;

// The caller's own brand matches only — resolved from their own session, not
// an arbitrary id in the request. getCreatorBrandMatches needs a
// service-role client regardless of whose data (brand_brackets has RLS with
// no policies), so this bridges the client-side dashboard's anon-key session
// to that service-role read, the same way app/claim/[handle]/page.tsx (a
// server component) calls it directly.
export async function GET() {
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
      ...(result ?? { creatorFollowers: null, totalMatchCount: 0, matches: [], strongestMatch: null, teaserPreview: [] }),
      detectedNiche: socialRow.data?.detected_niche ?? null,
    });
  } catch (err) {
    if (err instanceof TimeoutError) return NextResponse.json({ error: 'Timed out' }, { status: 504 });
    throw err;
  }
}

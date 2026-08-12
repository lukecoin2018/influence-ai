import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { withNoStore } from '@/lib/http/no-store';

// Session-gated for the same reason as app/api/creators/route.ts: this returns
// the identical select('*') row from v_creator_summary — contact_email, the
// enrichment blob, the AI summary. The 2–4 handle cap is per request only, with
// no cross-request limit, and every handle is public from the crawlable
// /creators/[handle] pages. So this walks the same index four rows at a time,
// and gating /api/creators without gating this one accomplishes nothing.
//
// withNoStore() is REQUIRED here, not optional. This route used to be one of the
// deliberately-cacheable public GETs (body depended only on the URL), and
// Webuzo's nginx keys on URI alone with proxy_cache_valid 200 60m. Now that the
// body depends on a session, an authenticated 200 would be stored and replayed
// to every later caller including anonymous ones — defeating the gate and
// re-creating the cross-user leak. See lib/http/no-store.ts.
export const GET = withNoStore(handleGET);

async function handleGET(request: Request) {
  // Auth first, before any query work — same order and same fail-closed
  // posture as app/api/creators/route.ts.
  let user;
  try {
    const serverSupabase = await createSupabaseServerClient();
    const { data } = await serverSupabase.auth.getUser();
    user = data.user;
  } catch {
    // Auth unreachable, not absent. 503 rather than 401 so a transient fault
    // does not bounce a still-valid session to the login page.
    return NextResponse.json(
      { error: 'Auth check unavailable', reason: 'auth_unavailable' },
      { status: 503 }
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', reason: 'auth_required' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const handlesParam = searchParams.get('handles');

  if (!handlesParam) {
    return NextResponse.json({ error: 'handles param required' }, { status: 400 });
  }

  const handles = handlesParam.split(',').map((h) => h.trim()).filter(Boolean);

  if (handles.length < 2 || handles.length > 4) {
    return NextResponse.json({ error: 'Provide between 2 and 4 handles' }, { status: 400 });
  }

  const orFilter = handles
    .map((h) => `instagram_handle.eq.${h},tiktok_handle.eq.${h}`)
    .join(',');

  const { data, error } = await supabase
    .from('v_creator_summary')
    .select('*')
    .or(orFilter);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ creators: data });
}

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { withNoStore } from '@/lib/http/no-store';
import { isDashboardEventType, recordDashboardEvent } from '@/lib/dashboard/events';

/**
 * POST /api/creator/events — the one write path into creator_dashboard_events.
 *
 * Body: { type: DashboardEventType, details?: object }. Answers
 *   401  no session                       (reason auth_required)
 *   503  creator_profiles lookup failed   (reason lookup_failed)
 *   403  session is not a creator         (reason no_profile)
 *   400  unparseable body / unknown type  (reason invalid_body / unknown_type)
 *   204  accepted — whether or not a row was written (see below)
 *
 * Auth follows resolveCreatorProfile() in app/api/creator/outreach/route.ts:
 * session, then the caller's OWN creator_profiles row through their own client
 * (so RLS is a second opinion), with the same three-way split of failed
 * lookup / no row / row. The one difference is deliberate: this route does NOT
 * refuse an unverified claim. The dashboard shell renders a lock overlay for
 * pending and rejected creators but still mounts every page underneath it
 * (app/creator-dashboard/_CreatorDashboardChrome.tsx:103), and "a pending
 * creator keeps coming back" is a signal worth having. So:
 *
 *   claim_status = 'verified'   every type is recorded
 *   anything else               dashboard_opened is recorded; every other
 *                               type answers 204 and writes nothing, because
 *                               the creator could not actually use that page.
 *
 * The rule lives here, once, rather than in eight client call sites.
 *
 * 204 also covers the dedupe: the same profile sending the same type within
 * 2 seconds (a double mount) gets a 204 and no second row. The caller is a
 * fire-and-forget beacon and never reads the response, so nothing
 * distinguishes the outcomes on the wire, on purpose.
 *
 * The write is awaited, not deferred with after(): the dedupe reads the latest
 * row, and a deferred write would let two rapid requests both read nothing.
 *
 * Node runtime (the default). Stated so nobody moves it to the edge: the
 * writer builds a service-role client from process.env and uses Buffer.
 */
export const runtime = 'nodejs';

const DEDUPE_WINDOW_MS = 2_000;

export const POST = withNoStore(handlePOST);

function noContent() {
  return new NextResponse(null, { status: 204 });
}

async function handlePOST(req: NextRequest) {
  const session = await createSupabaseServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', reason: 'auth_required' }, { status: 401 });

  let body: { type?: unknown; details?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body', reason: 'invalid_body' }, { status: 400 });
  }
  if (!isDashboardEventType(body.type)) {
    return NextResponse.json({ error: 'Unknown event type', reason: 'unknown_type' }, { status: 400 });
  }

  const { data: profile, error: profileError } = await session
    .from('creator_profiles')
    .select('id, claim_status')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) {
    console.error(`[dashboard-events] creator_profiles lookup failed for ${user.id.slice(0, 8)}…: ${profileError.message}`);
    return NextResponse.json({ error: 'Lookup failed', reason: 'lookup_failed' }, { status: 503 });
  }
  if (!profile?.id) return NextResponse.json({ error: 'Forbidden', reason: 'no_profile' }, { status: 403 });

  if (profile.claim_status !== 'verified' && body.type !== 'dashboard_opened') return noContent();

  await recordDashboardEvent({
    creatorProfileId: profile.id,
    type: body.type,
    details: body.details,
    dedupeWindowMs: DEDUPE_WINDOW_MS,
  });

  return noContent();
}

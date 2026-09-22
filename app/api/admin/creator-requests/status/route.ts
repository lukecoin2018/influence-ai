import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { requireOwnerApi } from '@/lib/auth/api-guards';
import { withNoStore } from '@/lib/http/no-store';
import { OPEN_REQUEST_SELECT, fulfilRequest, type OpenRequest } from '@/lib/creator-requests/fulfil';

/**
 * Resolves one creator_requests row by hand. Owner only.
 *
 * Same shape as app/api/admin/creators/status/route.ts and
 * app/api/admin/brands/status/route.ts: owner gate, service-role write,
 * no-store, best-effort audit row.
 *
 * ── THE TWO ACTIONS ARE NOT SYMMETRICAL ────────────────────────────────────
 *
 * `declined` closes the request and sends nothing — the decision the prompt
 * for this feature made, and the right one: we have no message for "we
 * decided not to add you" that is worth sending.
 *
 * `added` does NOT simply stamp the column. It runs the same fulfilRequest()
 * the daily cron pass runs, which means it can answer `not_in_database` or
 * `platform_disabled` and change nothing. Those refusals are the point.
 *
 * `platform_disabled` is the newer of the two: TikTok requests are held out of
 * fulfilment entirely (FULFIL_ENABLED_PLATFORMS in
 * lib/creator-requests/shared.ts) because TikTok verification has never run
 * successfully, so the claim link would land the creator on a step nobody has
 * proven works. The button refuses rather than closing the row, so the request
 * is still there when TikTok verification is fixed.
 *
 * `not_in_database` is the older one, and it exists because the natural admin
 * workflow is to paste the handle into the scraper and immediately mark the
 * request added — and a plain status write there would take the row out of
 * 'new', which is the only state the fulfil pass looks at, so the creator
 * would never get the claim link this whole feature exists to send them.
 * Refusing until the handle is actually in the database makes that
 * impossible, and once it IS in, this button is simply "do it now instead of
 * at 09:00 UTC".
 */

const ALLOWED = ['added', 'declined'] as const;
type Status = (typeof ALLOWED)[number];

export const POST = withNoStore(handlePOST);

async function handlePOST(req: NextRequest) {
  const auth = await requireOwnerApi();
  if ('error' in auth) return auth.error;

  const { requestId, status } = await req.json().catch(() => ({}) as Record<string, unknown>);

  if (typeof requestId !== 'string' || !requestId) {
    return NextResponse.json({ error: 'requestId required', reason: 'request_id_required' }, { status: 400 });
  }
  if (typeof status !== 'string' || !ALLOWED.includes(status as Status)) {
    return NextResponse.json({ error: 'Invalid status', reason: 'invalid_status' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: row, error: readError } = await admin
    .from('creator_requests')
    .select(OPEN_REQUEST_SELECT)
    .eq('id', requestId)
    .maybeSingle();

  if (readError) {
    console.error(`[admin-requests] read failed for ${requestId}: ${readError.message}`);
    return NextResponse.json({ error: 'Lookup failed', reason: 'lookup_failed' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Request not found', reason: 'request_not_found' }, { status: 404 });
  }

  // ── Mark added: delegate, and let it refuse ─────────────────────────────
  if (status === 'added') {
    const result = await fulfilRequest(admin, row as OpenRequest, auth.userId);

    // Held platform: nothing was read, written or sent. A 409 like
    // not_in_database — the request is untouched and still open — with its own
    // reason code so the queue can say why, because "not in the database yet"
    // would be a lie here and would send the admin off to check the scraper.
    if (result.outcome === 'platform_disabled') {
      return NextResponse.json(
        {
          error: 'TikTok fulfilment is disabled until TikTok verification is proven',
          reason: 'platform_disabled',
        },
        { status: 409 },
      );
    }

    if (result.outcome === 'not_in_database') {
      return NextResponse.json(
        {
          error: 'Handle is not in the database yet',
          reason: 'not_in_database',
        },
        { status: 409 },
      );
    }
    if (result.outcome === 'skipped') {
      return NextResponse.json({ success: true, status: 'added', emailStatus: 'skipped' }, { status: 200 });
    }
    // 'failed' still closed the request when the failure was the email rather
    // than the claim — fulfilRequest() reports which through `creatorId`, and
    // either way the admin gets the truth instead of a green tick.
    return NextResponse.json({
      success: result.outcome === 'sent',
      status: 'added',
      emailStatus: result.outcome === 'sent' ? 'sent' : 'failed',
      ...(result.error ? { detail: result.error } : {}),
    });
  }

  // ── Decline: status and resolved_at, no email ───────────────────────────
  // `.eq('status', 'new')` so a second click on a row another tab already
  // resolved cannot re-open or re-stamp it.
  const { data: updated, error } = await admin
    .from('creator_requests')
    .update({ status: 'declined', resolved_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'new')
    .select('id');

  if (error) {
    console.error(`[admin-requests] decline failed for ${requestId}: ${error.message}`);
    return NextResponse.json({ error: 'Update failed', reason: 'update_failed' }, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Request is no longer open', reason: 'not_open' }, { status: 409 });
  }

  const { error: logError } = await admin.from('activity_log').insert({
    event_type: 'creator_request_declined',
    target_id: requestId,
    user_id: auth.userId,
    details: { handle: (row as OpenRequest).handle },
  });
  if (logError) {
    console.error(`[admin-requests] activity_log insert failed for ${requestId}: ${logError.message}`);
  }

  return NextResponse.json({ success: true, status: 'declined', emailStatus: 'skipped' });
}

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { requireOwnerApi } from '@/lib/auth/api-guards';
import { withNoStore } from '@/lib/http/no-store';
import { recordFunnelEvent } from '@/lib/funnel/events';

/**
 * Sets a creator claim's status by hand. Owner only.
 *
 * ── WHY THIS ROUTE EXISTS ──────────────────────────────────────────────────
 *
 * app/admin/creators/page.tsx used to write this straight from the browser:
 *
 *     supabase.from('creator_profiles').update({ claim_status: status })
 *
 * That set ONE column. The real verification path,
 * app/api/creators/verify-bio/route.ts, sets six: it also stamps claimed_at
 * (which CLAUDE.md defines as "when the claim became verified"), clears the
 * bio code and its expiry, and resets the attempt counter. An admin-verified
 * creator therefore had claimed_at NULL and a live verification code sitting
 * in the row, and never appeared in funnel_events as `verified`.
 *
 * Same shape as app/api/admin/brands/status/route.ts: owner gate, service-role
 * write, no-store, best-effort audit row. The service-role client is also what
 * makes the write pass migration 0015's column-protection trigger regardless
 * of how the admin's user_roles row is set up.
 *
 * Deliberately no email. The only transport here is Gmail SMTP to ourselves
 * (see lib/notifications/brand-approval.ts for why that is not a sender for
 * strangers). Approving is a silent act; someone has to tell the creator.
 */

const ALLOWED = ['verified', 'rejected'] as const;
type Status = (typeof ALLOWED)[number];

export const POST = withNoStore(handlePOST);

async function handlePOST(req: NextRequest) {
  const auth = await requireOwnerApi();
  if ('error' in auth) return auth.error;

  const { creatorProfileId, status } = await req.json().catch(() => ({}) as Record<string, unknown>);

  if (typeof creatorProfileId !== 'string' || !creatorProfileId) {
    return NextResponse.json({ error: 'creatorProfileId required', reason: 'creator_profile_id_required' }, { status: 400 });
  }

  if (typeof status !== 'string' || !ALLOWED.includes(status as Status)) {
    return NextResponse.json({ error: 'Invalid status', reason: 'invalid_status' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Field set per outcome. `verified` mirrors verify-bio's success branch
  // exactly; `rejected` clears the code (there is nothing left to prove) but
  // leaves the attempt counters, which are history.
  const patch =
    status === 'verified'
      ? {
          claim_status: 'verified',
          claimed_at: now,
          verification_code: null,
          verification_code_expires_at: null,
          verification_attempts: 0,
          last_verification_attempt_at: null,
          updated_at: now,
        }
      : {
          claim_status: 'rejected',
          verification_code: null,
          verification_code_expires_at: null,
          updated_at: now,
        };

  const admin = createSupabaseAdminClient();

  // Selected back so a creatorProfileId that matches nothing is a 404 rather
  // than a silent success, and so the funnel event below has its dimensions.
  const { data: updated, error } = await admin
    .from('creator_profiles')
    .update(patch)
    .eq('id', creatorProfileId)
    .select('id, creator_id, claim_status, locale')
    .maybeSingle();

  if (error) {
    console.error(`[admin-creators] failed to set ${creatorProfileId} to ${status}: ${error.message}`);
    return NextResponse.json({ error: 'Update failed', reason: 'update_failed' }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: 'Creator profile not found', reason: 'creator_not_found' }, { status: 404 });
  }

  // Best-effort audit row, exactly as the client used to write it, plus the
  // actor in user_id. Failure is logged and swallowed: an audit row must never
  // cost the operator their action.
  const { error: logError } = await admin.from('activity_log').insert({
    event_type: status === 'verified' ? 'creator_verified' : 'creator_rejected',
    target_id: creatorProfileId,
    user_id: auth.userId,
    details: { action: status },
  });
  if (logError) {
    console.error(`[admin-creators] activity_log insert failed for ${creatorProfileId}: ${logError.message}`);
  }

  // Funnel: an admin-verified creator is a verified creator. Same event
  // verify-bio fires at its :215, with the handle resolved the same way (from
  // the profile's creator_id, never from the request), and a distinct `path`
  // so the two routes to verified stay separable in the data.
  if (status === 'verified') {
    let handle: string | null = null;
    let platform: string | null = null;
    if (updated.creator_id) {
      const { data: social } = await admin
        .from('social_profiles')
        .select('handle, platform')
        .eq('creator_id', updated.creator_id)
        .limit(1)
        .maybeSingle();
      handle = social?.handle ?? null;
      platform = social?.platform ?? null;
    }
    recordFunnelEvent({
      eventType: 'verified',
      handle,
      creatorId: updated.creator_id ?? null,
      creatorProfileId: updated.id,
      locale: updated.locale ?? null,
      userAgent: req.headers.get('user-agent'),
      details: { path: 'admin_approve', platform },
    });
  }

  return NextResponse.json({ success: true, claim_status: updated.claim_status });
}

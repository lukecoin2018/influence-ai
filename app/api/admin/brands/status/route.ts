import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { requireOwnerApi } from '@/lib/auth/api-guards';
import { withNoStore } from '@/lib/http/no-store';
import { notifyBrandApproved } from '@/lib/notifications/brand-approval';

/**
 * Sets a brand's approval_status. Owner only.
 *
 * ── WHY THIS ROUTE EXISTS ──────────────────────────────────────────────────
 *
 * app/admin/brands/page.tsx used to write this straight from the browser with
 * the anon key:
 *
 *     supabase.from('brand_profiles').update({ approval_status: status })
 *
 * Two problems. The one that matters: approval_status is now the thing that
 * opens the creator database, so the write that grants it should not be
 * issued by a client, where its only defence is an RLS policy that lives
 * outside this repo and cannot be read alongside the code it protects. The
 * other: approval needs to notify the brand, and a browser cannot send mail.
 *
 * The values are validated here rather than trusted, so a caller cannot invent
 * a status. They are exactly the four the CHECK constraint added in migration
 * 0016 permits — keep the two in step.
 */

const ALLOWED = ['pending', 'approved', 'rejected', 'suspended'] as const;
type Status = (typeof ALLOWED)[number];

export const POST = withNoStore(handlePOST);

async function handlePOST(req: NextRequest) {
  const auth = await requireOwnerApi();
  if ('error' in auth) return auth.error;

  const { brandId, status } = await req.json().catch(() => ({}) as Record<string, unknown>);

  if (typeof brandId !== 'string' || !brandId) {
    return NextResponse.json({ error: 'brandId required', reason: 'brand_id_required' }, { status: 400 });
  }

  if (typeof status !== 'string' || !ALLOWED.includes(status as Status)) {
    return NextResponse.json({ error: 'Invalid status', reason: 'invalid_status' }, { status: 400 });
  }

  // Service-role: this is an owner-gated administrative write, and the gate
  // above is the authorization. Using the caller's client instead would put us
  // back to depending on an RLS policy for the decision.
  const admin = createSupabaseAdminClient();

  // Selected back so the notification hook has something to say, and so a
  // brandId that matches nothing is a 404 rather than a silent success.
  const { data: updated, error } = await admin
    .from('brand_profiles')
    .update({ approval_status: status })
    .eq('id', brandId)
    .select('id, email, company_name, approval_status')
    .maybeSingle();

  if (error) {
    console.error(`[admin-brands] failed to set ${brandId} to ${status}: ${error.message}`);
    return NextResponse.json({ error: 'Update failed', reason: 'update_failed' }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: 'Brand not found', reason: 'brand_not_found' }, { status: 404 });
  }

  // Best-effort, exactly as it was on the client: an audit row must never cost
  // the operator their action. Failure is logged and swallowed.
  const { error: logError } = await admin.from('activity_log').insert({
    event_type: `brand_${status}`,
    target_id: brandId,
    // The actor belongs in user_id, which activity_log has and which was being
    // left null while the same value was buried in details as `by`. Putting it
    // in the column means a reader can join or filter on it instead of parsing
    // JSON. `details` keeps `action` for continuity with the rows already
    // written this way.
    user_id: auth.userId,
    details: { action: status },
  });
  if (logError) {
    console.error(`[admin-brands] activity_log insert failed for ${brandId}: ${logError.message}`);
  }

  // Fires only on approval, and only after the write succeeded. It does not
  // send — see lib/notifications/brand-approval.ts for why that is deliberate.
  // Awaited rather than fire-and-forget because it currently only logs; when a
  // real sender lands, revisit whether it should move to after().
  if (status === 'approved') {
    try {
      await notifyBrandApproved({
        brandId,
        email: updated.email ?? null,
        companyName: updated.company_name ?? null,
      });
    } catch (err) {
      // Notifying must never undo an approval that already happened.
      console.error(`[admin-brands] notify hook threw for ${brandId}:`, err);
    }
  }

  return NextResponse.json({ success: true, approval_status: updated.approval_status });
}

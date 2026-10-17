import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerApi } from '@/lib/auth/api-guards';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { withNoStore } from '@/lib/http/no-store';

/**
 * The owner manages additional admins: add (by the email of an existing
 * Supabase auth account), block, unblock, remove. OWNER ONLY: an additional
 * admin, active or blocked, gets 403 not_owner, and so does everyone else.
 *
 * Body: { action: 'add', email } or { action: 'block' | 'unblock' | 'remove', userId }.
 *
 * Each action is one call to a migration-0032 function that makes the whole
 * change and writes its activity_log row (actor = the owner) in one
 * transaction. Those functions also refuse to touch the owner: Add refuses an
 * account that already has a user_roles row, and the other three act only on
 * accounts with an admin_users row, which the owner never has. The owner's id
 * is refused here as well, before the call.
 *
 * Answers { outcome } on success and { reason } on refusal, codes only; the
 * page maps them to its own wording.
 */

type Action = 'add' | 'block' | 'unblock' | 'remove';

const ACTIONS: readonly Action[] = ['add', 'block', 'unblock', 'remove'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Outcomes that mean the change was made (or was already so). */
const DONE = new Set(['added', 'blocked', 'unblocked', 'unchanged', 'removed']);

/** HTTP status for each refusal the functions can return. */
const REFUSED_STATUS: Record<string, number> = {
  not_found: 404,
  ambiguous_email: 409,
  is_self: 409,
  already_admin: 409,
  has_creator_profile: 409,
  has_brand_profile: 409,
  has_other_role: 409,
};

export const POST = withNoStore(handlePOST);

async function handlePOST(req: NextRequest) {
  const auth = await requireOwnerApi();
  if ('error' in auth) return auth.error;

  let body: { action?: unknown; email?: unknown; userId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', reason: 'invalid_body' }, { status: 400 });
  }

  const action = body.action as Action;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Unknown action', reason: 'invalid_action' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  let call;

  if (action === 'add') {
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email || email.length > 320 || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required', reason: 'invalid_email' }, { status: 400 });
    }
    call = admin.rpc('admin_user_add', { p_email: email, p_actor: auth.userId });
  } else {
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!UUID_RE.test(userId)) {
      return NextResponse.json({ error: 'A valid userId is required', reason: 'invalid_user_id' }, { status: 400 });
    }
    if (userId.toLowerCase() === auth.userId.toLowerCase()) {
      return NextResponse.json({ error: 'The owner cannot be changed here', reason: 'is_self' }, { status: 409 });
    }
    call = action === 'remove'
      ? admin.rpc('admin_user_remove', { p_user_id: userId, p_actor: auth.userId })
      : admin.rpc('admin_user_set_status', {
          p_user_id: userId,
          p_status: action === 'block' ? 'blocked' : 'active',
          p_actor: auth.userId,
        });
  }

  const { data, error } = await call;

  if (error) {
    // PGRST202: PostgREST cannot find the function, i.e. 0032 is not applied.
    if (error.code === 'PGRST202' || error.code === '42883') {
      return NextResponse.json({ error: 'Migration 0032 is not applied', reason: 'migration_missing' }, { status: 503 });
    }
    console.error(`[admin-admins] ${action} failed: ${error.message}`);
    return NextResponse.json({ error: 'Failed', reason: 'failed' }, { status: 500 });
  }

  const outcome = typeof data === 'string' ? data : '';
  if (DONE.has(outcome)) {
    return NextResponse.json({ outcome });
  }
  if (outcome in REFUSED_STATUS) {
    return NextResponse.json({ error: 'Refused', reason: outcome }, { status: REFUSED_STATUS[outcome] });
  }

  console.error(`[admin-admins] ${action} returned an unexpected outcome: ${JSON.stringify(data)}`);
  return NextResponse.json({ error: 'Failed', reason: 'failed' }, { status: 500 });
}

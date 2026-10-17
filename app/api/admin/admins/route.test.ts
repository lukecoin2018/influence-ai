import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/admins at the module boundary: the owner gate answers
 * first, the body is validated before any database call, the owner's own id
 * is refused, each action calls the right 0032 function with the owner as
 * actor, and each function outcome maps to a status and a code.
 */

const OWNER = 'ed64026a-6cc3-4903-be88-19c6aa1c1817';
const OTHER = '44444444-4444-4444-8444-444444444444';

const requireOwnerApi = vi.fn();
const rpc = vi.fn();

vi.mock('@/lib/auth/api-guards', () => ({ requireOwnerApi: () => requireOwnerApi() }));
vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: () => ({ rpc }) }));

const { POST } = await import('./route');

function post(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/admin/admins', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
    {} as never,
  );
}

describe('POST /api/admin/admins', () => {
  beforeEach(() => {
    requireOwnerApi.mockReset();
    requireOwnerApi.mockResolvedValue({ userId: OWNER });
    rpc.mockReset();
    rpc.mockResolvedValue({ data: 'added', error: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('lets the owner gate answer first, so an additional admin cannot call it', async () => {
    requireOwnerApi.mockResolvedValue({ error: NextResponse.json({ reason: 'not_owner' }, { status: 403 }) });
    const res = await post({ action: 'add', email: 'x@example.com' });
    expect(res.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('is never cacheable', async () => {
    const res = await post({ action: 'add', email: 'x@example.com' });
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('validates the body before calling the database', async () => {
    expect((await post('not json')).status).toBe(400);
    expect((await post({ action: 'promote', email: 'x@example.com' })).status).toBe(400);
    expect(await (await post({ action: 'add', email: 'no-at-sign' })).json()).toMatchObject({ reason: 'invalid_email' });
    expect(await (await post({ action: 'block', userId: 'not-a-uuid' })).json()).toMatchObject({ reason: 'invalid_user_id' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses the owner as a target of block, unblock or remove', async () => {
    for (const action of ['block', 'unblock', 'remove']) {
      const res = await post({ action, userId: OWNER.toUpperCase() });
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ reason: 'is_self' });
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it('calls each 0032 function with the owner as the actor', async () => {
    await post({ action: 'add', email: '  New.Admin@example.com ' });
    expect(rpc).toHaveBeenLastCalledWith('admin_user_add', { p_email: 'New.Admin@example.com', p_actor: OWNER });

    rpc.mockResolvedValue({ data: 'blocked', error: null });
    await post({ action: 'block', userId: OTHER });
    expect(rpc).toHaveBeenLastCalledWith('admin_user_set_status', { p_user_id: OTHER, p_status: 'blocked', p_actor: OWNER });

    rpc.mockResolvedValue({ data: 'unblocked', error: null });
    await post({ action: 'unblock', userId: OTHER });
    expect(rpc).toHaveBeenLastCalledWith('admin_user_set_status', { p_user_id: OTHER, p_status: 'active', p_actor: OWNER });

    rpc.mockResolvedValue({ data: 'removed', error: null });
    await post({ action: 'remove', userId: OTHER });
    expect(rpc).toHaveBeenLastCalledWith('admin_user_remove', { p_user_id: OTHER, p_actor: OWNER });
  });

  it('answers 200 with the outcome when the change was made', async () => {
    for (const outcome of ['added', 'blocked', 'unblocked', 'unchanged', 'removed']) {
      rpc.mockResolvedValue({ data: outcome, error: null });
      const res = await post(outcome === 'added' ? { action: 'add', email: 'x@example.com' } : { action: 'block', userId: OTHER });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ outcome });
    }
  });

  it('maps every refusal to its status and code', async () => {
    const cases: [string, number][] = [
      ['not_found', 404],
      ['ambiguous_email', 409],
      ['is_self', 409],
      ['already_admin', 409],
      ['has_creator_profile', 409],
      ['has_brand_profile', 409],
      ['has_other_role', 409],
    ];
    for (const [reason, status] of cases) {
      rpc.mockResolvedValue({ data: reason, error: null });
      const res = await post({ action: 'add', email: 'x@example.com' });
      expect(res.status).toBe(status);
      expect(await res.json()).toMatchObject({ reason });
    }
  });

  it('says so when 0032 is not applied, and 500s on anything else', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
    let res = await post({ action: 'add', email: 'x@example.com' });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ reason: 'migration_missing' });

    rpc.mockResolvedValue({ data: null, error: { code: '57014', message: 'canceling statement' } });
    res = await post({ action: 'add', email: 'x@example.com' });
    expect(res.status).toBe(500);

    rpc.mockResolvedValue({ data: 'something_new', error: null });
    res = await post({ action: 'add', email: 'x@example.com' });
    expect(res.status).toBe(500);
  });
});

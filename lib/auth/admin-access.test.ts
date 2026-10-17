import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveAdminAccess, type AdminAccessDeps, type AdminRowLookup } from './admin-access';

/**
 * The admin decision, with its inputs faked. The owner cases assert that the
 * admin_users lookup is never called: that is what keeps the owner's access
 * independent of migration 0032 (table missing, empty, erroring, slow).
 */

const OWNER = 'ed64026a-6cc3-4903-be88-19c6aa1c1817';
const OTHER = '44444444-4444-4444-8444-444444444444';

function deps(over: Partial<AdminAccessDeps> & { row?: AdminRowLookup } = {}) {
  const lookupAdminRow = vi.fn(async () => over.row ?? { status: null });
  return {
    deps: {
      ownerId: OWNER,
      getUserId: async () => OTHER,
      lookupAdminRow,
      ...over,
    } satisfies AdminAccessDeps,
    lookupAdminRow: over.lookupAdminRow ?? lookupAdminRow,
  };
}

describe('resolveAdminAccess', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('lets the owner in without looking at admin_users at all', async () => {
    const lookupAdminRow = vi.fn(async (): Promise<AdminRowLookup> => { throw new Error('relation "admin_users" does not exist'); });
    const { deps: d } = deps({ getUserId: async () => OWNER, lookupAdminRow });
    expect(await resolveAdminAccess(d)).toEqual({ kind: 'owner', userId: OWNER });
    expect(lookupAdminRow).not.toHaveBeenCalled();
  });

  it('lets the owner in when ADMIN_USER_ID differs only in letter case or surrounding space', async () => {
    const { deps: d, lookupAdminRow } = deps({ ownerId: `  ${OWNER.toUpperCase()} `, getUserId: async () => OWNER });
    expect(await resolveAdminAccess(d)).toEqual({ kind: 'owner', userId: OWNER });
    expect(lookupAdminRow).not.toHaveBeenCalled();
  });

  it('admits an additional admin whose row is active', async () => {
    const { deps: d, lookupAdminRow } = deps({ row: { status: 'active' } });
    expect(await resolveAdminAccess(d)).toEqual({ kind: 'admin', userId: OTHER });
    expect(lookupAdminRow).toHaveBeenCalledWith(OTHER);
  });

  it('pauses an additional admin whose row is blocked', async () => {
    const { deps: d } = deps({ row: { status: 'blocked' } });
    expect(await resolveAdminAccess(d)).toEqual({ kind: 'paused', userId: OTHER });
  });

  it('pauses on any status other than active (a positive check)', async () => {
    const { deps: d } = deps({ row: { status: 'suspended' } });
    expect(await resolveAdminAccess(d)).toEqual({ kind: 'paused', userId: OTHER });
  });

  it('denies a signed-in account with no admin_users row (including when the table is empty)', async () => {
    const { deps: d } = deps({ row: { status: null } });
    expect(await resolveAdminAccess(d)).toEqual({ kind: 'none', userId: OTHER });
  });

  it('denies, as unverified, when the lookup errors (e.g. 0032 not applied)', async () => {
    const { deps: d } = deps({ row: { error: 'Could not find the table public.admin_users' } });
    expect(await resolveAdminAccess(d)).toEqual({ kind: 'unverified', reason: 'admin_check_unavailable' });
  });

  it('denies, as unverified, when the lookup throws or times out', async () => {
    const lookupAdminRow = vi.fn(async (): Promise<AdminRowLookup> => { throw new Error('Timed out after 5000ms'); });
    const { deps: d } = deps({ lookupAdminRow });
    expect(await resolveAdminAccess(d)).toEqual({ kind: 'unverified', reason: 'admin_check_unavailable' });
  });

  it('is anonymous with no session, without a lookup', async () => {
    const { deps: d, lookupAdminRow } = deps({ getUserId: async () => null });
    expect(await resolveAdminAccess(d)).toEqual({ kind: 'anonymous' });
    expect(lookupAdminRow).not.toHaveBeenCalled();
  });

  it('is unverified when the auth server cannot be reached', async () => {
    const { deps: d } = deps({ getUserId: async () => { throw new Error('fetch failed'); } });
    expect(await resolveAdminAccess(d)).toEqual({ kind: 'unverified', reason: 'auth_unavailable' });
  });

  it('denies everyone, the owner and additional admins included, when ADMIN_USER_ID is unset', async () => {
    for (const ownerId of [undefined, '', '   ']) {
      const owner = deps({ ownerId, getUserId: async () => OWNER });
      expect(await resolveAdminAccess(owner.deps)).toEqual({ kind: 'none', userId: OWNER });
      const active = deps({ ownerId, row: { status: 'active' } });
      expect(await resolveAdminAccess(active.deps)).toEqual({ kind: 'none', userId: OTHER });
      expect(active.lookupAdminRow).not.toHaveBeenCalled();
    }
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminAccess } from './admin-access';

/**
 * What each admin decision turns into: a redirect for pages (server-guards),
 * a status and reason code for API routes (api-guards). getAdminAccess() is
 * faked; admin-access.test.ts covers the decision itself.
 */

let access: AdminAccess = { kind: 'anonymous' };

vi.mock('@/lib/auth/admin-access', () => ({ getAdminAccess: async () => access }));
vi.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new Error(`REDIRECT ${to}`); },
}));

const { requireAdmin, requireOwner } = await import('./server-guards');
const { requireAdminApi, requireOwnerApi } = await import('./api-guards');

const ALL: AdminAccess[] = [
  { kind: 'owner', userId: 'o' },
  { kind: 'admin', userId: 'a' },
  { kind: 'paused', userId: 'p' },
  { kind: 'none', userId: 'n' },
  { kind: 'anonymous' },
  { kind: 'unverified', reason: 'auth_unavailable' },
  { kind: 'unverified', reason: 'admin_check_unavailable' },
];

async function pageOutcome(fn: () => Promise<unknown>): Promise<string> {
  try {
    return JSON.stringify(await fn());
  } catch (e) {
    return (e as Error).message;
  }
}

async function apiOutcome(fn: () => Promise<{ error: Response } | object>): Promise<string> {
  const r = await fn();
  if ('error' in r) {
    const res = (r as { error: Response }).error;
    return `${res.status} ${(await res.json()).reason}`;
  }
  return JSON.stringify(r);
}

describe('page and API admin gates', () => {
  beforeEach(() => { access = { kind: 'anonymous' }; });

  it('requireAdmin: owner and active admin in; others redirected', async () => {
    const got: string[] = [];
    for (const a of ALL) { access = a; got.push(await pageOutcome(requireAdmin)); }
    expect(got).toEqual([
      '{"userId":"o","isOwner":true}',
      '{"userId":"a","isOwner":false}',
      'REDIRECT /admin',
      'REDIRECT /',
      'REDIRECT /login',
      'REDIRECT /admin',
      'REDIRECT /admin',
    ]);
  });

  it('requireOwner: only the owner; an additional admin, active or paused, is sent to /admin', async () => {
    const got: string[] = [];
    for (const a of ALL) { access = a; got.push(await pageOutcome(requireOwner)); }
    expect(got).toEqual([
      '{"userId":"o"}',
      'REDIRECT /admin',
      'REDIRECT /admin',
      'REDIRECT /',
      'REDIRECT /login',
      'REDIRECT /admin',
      'REDIRECT /admin',
    ]);
  });

  it('requireAdminApi: owner and active admin in; reason codes for the rest', async () => {
    const got: string[] = [];
    for (const a of ALL) { access = a; got.push(await apiOutcome(requireAdminApi)); }
    expect(got).toEqual([
      '{"userId":"o","isOwner":true}',
      '{"userId":"a","isOwner":false}',
      '403 admin_paused',
      '403 not_admin',
      '401 auth_required',
      '503 auth_unavailable',
      '503 admin_check_unavailable',
    ]);
  });

  it('requireOwnerApi: only the owner; an additional admin is 403 not_owner', async () => {
    const got: string[] = [];
    for (const a of ALL) { access = a; got.push(await apiOutcome(requireOwnerApi)); }
    expect(got).toEqual([
      '{"userId":"o"}',
      '403 not_owner',
      '403 not_owner',
      '403 not_owner',
      '401 auth_required',
      '503 auth_unavailable',
      '403 not_owner',
    ]);
  });
});

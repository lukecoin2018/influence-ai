import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Brand signup is all-or-nothing: an account gets its auth user, its
 * user_roles 'brand' row and its brand_profiles row, or the auth user is
 * deleted and the brand is told nothing was saved.
 *
 * The role goes in before the profile, so every failure after createUser()
 * is undone by deleteUser() alone (the role row is ON DELETE CASCADE with the
 * auth user). The service-role client is a double that scripts one insert
 * result per table and records every call in order.
 */

const createUser = vi.fn();
const deleteUser = vi.fn();

type InsertResult = { error: { message: string } | null };

let inserts: Record<string, InsertResult> = {};
let calls: string[] = [];
let inserted: Record<string, Record<string, unknown>> = {};

function from(table: string) {
  return {
    insert(payload: Record<string, unknown>) {
      const result = inserts[table];
      if (!result) throw new Error(`test double has no insert script for table "${table}"`);
      calls.push(`insert ${table}`);
      inserted[table] = payload;
      return Promise.resolve(result);
    },
  };
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from,
    auth: {
      admin: {
        createUser: (...a: unknown[]) => { calls.push('createUser'); return createUser(...a); },
        deleteUser: (...a: unknown[]) => { calls.push('deleteUser'); return deleteUser(...a); },
      },
    },
  }),
}));

const { POST } = await import('./route');

const UID = 'brand-user-1';

function post(body: Record<string, unknown> = {
  email: 'test@example.com',
  password: 'correct-horse',
  companyName: '  Test Brand  ',
  contactName: 'Tess',
  website: '',
  industry: 'Other',
}) {
  return POST(
    new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
    {} as never,
  );
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  createUser.mockReset();
  createUser.mockResolvedValue({ data: { user: { id: UID } }, error: null });
  deleteUser.mockReset();
  deleteUser.mockResolvedValue({ data: {}, error: null });
  inserts = { user_roles: { error: null }, brand_profiles: { error: null } };
  calls = [];
  inserted = {};
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => { vi.restoreAllMocks(); });

describe('brand signup — the account is created whole', () => {
  it('writes the brand role, then the pending profile', async () => {
    const res = await post();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(calls).toEqual(['createUser', 'insert user_roles', 'insert brand_profiles']);
    expect(inserted.user_roles).toEqual({ user_id: UID, role: 'brand' });
    expect(inserted.brand_profiles).toMatchObject({
      id: UID,
      company_name: 'Test Brand',
      email: 'test@example.com',
      website: null,
      approval_status: 'pending',
    });
    expect(deleteUser).not.toHaveBeenCalled();
  });
});

describe('brand signup — a failure leaves nothing behind', () => {
  it('deletes the auth user and writes no profile when the role insert fails', async () => {
    inserts.user_roles = { error: { message: 'boom' } };

    const res = await post();

    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ reason: 'profile_failed' });
    expect(calls).toEqual(['createUser', 'insert user_roles', 'deleteUser']);
    expect(inserted.brand_profiles).toBeUndefined();
    expect(deleteUser).toHaveBeenCalledWith(UID);
    expect(consoleError.mock.calls[0][0]).toContain('role insert failed');
  });

  it('deletes the auth user, and with it the role row, when the profile insert fails', async () => {
    inserts.brand_profiles = { error: { message: 'boom' } };

    const res = await post();

    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ reason: 'profile_failed' });
    expect(calls).toEqual(['createUser', 'insert user_roles', 'insert brand_profiles', 'deleteUser']);
    expect(deleteUser).toHaveBeenCalledWith(UID);
    expect(consoleError.mock.calls[0][0]).toContain('profile insert failed');
  });

  it('logs an orphan, and still answers profile_failed, when the delete fails too', async () => {
    inserts.user_roles = { error: { message: 'boom' } };
    deleteUser.mockResolvedValue({ data: null, error: { message: 'delete refused' } });

    const res = await post();

    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ reason: 'profile_failed' });
    expect(consoleError.mock.calls.some((args: unknown[]) => String(args[0]).includes('ORPHAN CREATED'))).toBe(true);
  });
});

describe('brand signup — refused before an account exists', () => {
  it('writes nothing when createUser fails', async () => {
    createUser.mockResolvedValue({ data: { user: null }, error: { message: 'User already registered' } });

    const res = await post();

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ reason: 'signup_failed' });
    // The Supabase message is an account-enumeration oracle; it stays in the log.
    expect(JSON.stringify(body)).not.toContain('already registered');
    expect(calls).toEqual(['createUser']);
  });

  it('does not create a user when a required field is missing', async () => {
    const res = await post({ email: 'test@example.com', password: 'correct-horse', companyName: '   ' });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ reason: 'missing_fields' });
    expect(calls).toEqual([]);
  });
});

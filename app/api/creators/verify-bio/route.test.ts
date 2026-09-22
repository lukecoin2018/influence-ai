import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * The transition rule for the self-verification email: sendCreatorApproved()
 * runs exactly when the bio code was found AND the row was written, and never
 * for a profile that was already verified.
 *
 * Everything with a network behind it is mocked at the module boundary — the
 * session client, the bio check, the funnel event, the email helper — and the
 * service-role client is a double that scripts one result per table and
 * operation and records what was written.
 */

const getUser = vi.fn();
const checkBioForCode = vi.fn();
const sendCreatorApproved = vi.fn();
const recordFunnelEvent = vi.fn();

type Script = {
  select?: { data?: unknown; error?: { message: string } | null };
  update?: { data?: unknown; error?: { message: string } | null };
  insert?: { data?: unknown; error?: { message: string } | null };
  /** Filled in by the double. */
  updated?: Record<string, unknown>;
  inserted?: Record<string, unknown>;
};

let tables: Record<string, Script> = {};

function from(table: string) {
  const script = tables[table];
  if (!script) throw new Error(`test double has no script for table "${table}"`);
  let op: 'select' | 'update' = 'select';
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    limit: () => chain,
    update(payload: Record<string, unknown>) {
      op = 'update';
      script.updated = payload;
      return chain;
    },
    insert(payload: Record<string, unknown>) {
      script.inserted = payload;
      return Promise.resolve(script.insert ?? { data: null, error: null });
    },
    maybeSingle: () => Promise.resolve(script.select ?? { data: null, error: null }),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(op === 'update' ? (script.update ?? { data: null, error: null }) : script.select).then(resolve),
  };
  return chain;
}

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }));
vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser } }),
}));
vi.mock('@/lib/apify', () => ({ checkBioForCode: (...a: unknown[]) => checkBioForCode(...a) }));
vi.mock('@/lib/funnel/events', () => ({ recordFunnelEvent: (...a: unknown[]) => recordFunnelEvent(...a) }));
vi.mock('@/lib/email/send-creator-approved', () => ({
  sendCreatorApproved: (...a: unknown[]) => sendCreatorApproved(...a),
}));

const { POST } = await import('./route');

const UID = 'user-1';

function post(code = 'ABC123') {
  return POST(
    new NextRequest('http://localhost/api/creators/verify-bio', {
      method: 'POST',
      body: JSON.stringify({ code }),
      headers: { 'content-type': 'application/json' },
    }),
    {} as never,
  );
}

function pendingProfile(over: Record<string, unknown> = {}) {
  return {
    id: UID,
    claim_status: 'pending',
    verification_code: 'ABC123',
    verification_code_expires_at: new Date(Date.now() + 60_000).toISOString(),
    verification_attempts: 0,
    last_verification_attempt_at: null,
    creator_id: 'creator-1',
    locale: 'en',
    ...over,
  };
}

beforeEach(() => {
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: UID } } });
  checkBioForCode.mockReset();
  sendCreatorApproved.mockReset();
  sendCreatorApproved.mockResolvedValue({ email: 'sent', resend_id: 'resend-1' });
  recordFunnelEvent.mockReset();
  tables = {
    creator_profiles: { select: { data: pendingProfile() }, update: { data: null, error: null } },
    social_profiles: { select: { data: { handle: 'vicky', platform: 'instagram' } } },
    activity_log: {},
  };
});

describe('verify-bio — approval email on transition', () => {
  it('sends the approval email once the code is found and the row is written', async () => {
    checkBioForCode.mockResolvedValue('found');

    const res = await post();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, verified: true });

    // Written first, then mailed, with the outcome on the audit row.
    expect(tables.creator_profiles.updated).toMatchObject({ claim_status: 'verified' });
    expect(sendCreatorApproved).toHaveBeenCalledTimes(1);
    expect(sendCreatorApproved.mock.calls[0][1]).toBe(UID);
    expect(tables.activity_log.inserted).toEqual({
      event_type: 'creator_verified',
      target_id: UID,
      user_id: UID,
      details: { action: 'verified', path: 'bio_code', email: 'sent', resend_id: 'resend-1' },
    });
    expect(recordFunnelEvent).toHaveBeenCalledTimes(1);
  });

  it('does not email a profile that was already verified', async () => {
    tables.creator_profiles.select = { data: pendingProfile({ claim_status: 'verified' }) };

    const res = await post();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, verified: true });
    expect(checkBioForCode).not.toHaveBeenCalled();
    expect(sendCreatorApproved).not.toHaveBeenCalled();
    expect(tables.creator_profiles.updated).toBeUndefined();
    expect(tables.activity_log.inserted).toBeUndefined();
  });

  it('answers 503 write_failed, and emails nobody, when the row could not be written', async () => {
    checkBioForCode.mockResolvedValue('found');
    tables.creator_profiles.update = { data: null, error: { message: 'connection reset' } };

    const res = await post();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: 'write_failed' });
    expect(sendCreatorApproved).not.toHaveBeenCalled();
    expect(tables.activity_log.inserted).toBeUndefined();
    expect(recordFunnelEvent).not.toHaveBeenCalled();
  });

  it('still verifies when the email fails, recording the failure on the audit row', async () => {
    checkBioForCode.mockResolvedValue('found');
    sendCreatorApproved.mockResolvedValue({ email: 'failed', error: 'rate limited' });

    const res = await post();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, verified: true });
    expect(tables.activity_log.inserted?.details).toEqual({
      action: 'verified',
      path: 'bio_code',
      email: 'failed',
      error: 'rate limited',
    });
  });

  it('does not email when the code is absent from the bio', async () => {
    checkBioForCode.mockResolvedValue('absent');

    const res = await post();

    expect(await res.json()).toEqual({ ok: true, verified: false, reason: 'code_absent' });
    expect(sendCreatorApproved).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * sendCreatorApproved() against a hand-rolled Supabase double.
 *
 * Two things are faked and nothing else: `lib/email/client`, so a test never
 * reaches Resend (mocked at the module boundary rather than by unsetting
 * RESEND_API_KEY, because "not configured" is its own branch and would prove
 * the wrong thing), and the admin client, as a tiny builder that resolves
 * whatever each table was scripted to return. `server-only` at the top of the
 * module is handled by the alias in vitest.config.ts.
 */

const sendEmail = vi.fn();

vi.mock('@/lib/email/client', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
  SITE_URL: 'https://influenceit.app',
  maskEmail: (a: string) => `${a[0]}***`,
}));

const { sendCreatorApproved } = await import('./send-creator-approved');

type TableScript = { data?: unknown; error?: { message: string } | null };

function makeAdmin(opts: {
  authUser: { email?: string } | null;
  authError?: { message: string } | null;
  tables: Record<string, TableScript>;
}) {
  return {
    auth: {
      admin: {
        getUserById: vi.fn(async () => ({
          data: { user: opts.authUser },
          error: opts.authError ?? null,
        })),
      },
    },
    from(table: string) {
      const script = opts.tables[table];
      if (!script) throw new Error(`test double has no script for table "${table}"`);
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: () => Promise.resolve(script),
      };
      return chain;
    },
  };
}

beforeEach(() => {
  sendEmail.mockReset();
  sendEmail.mockResolvedValue({ ok: true, id: 'resend-1' });
});

describe('sendCreatorApproved', () => {
  it('sends the approval mail to the auth user, greeting by the profile name first', async () => {
    const admin = makeAdmin({
      authUser: { email: 'creator@example.com' },
      tables: {
        creator_profiles: { data: { display_name: 'Vicky López', creator_id: 'c-1' } },
        creators: { data: { display_name: 'Scraped Name' } },
      },
    });

    const outcome = await sendCreatorApproved(admin as never, 'profile-1');

    expect(outcome).toEqual({ email: 'sent', resend_id: 'resend-1' });
    expect(admin.auth.admin.getUserById).toHaveBeenCalledWith('profile-1');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toMatchObject({
      to: 'creator@example.com',
      subject: "You're verified on InfluenceIT",
      replyTo: process.env.ADMIN_EMAIL,
      tags: [{ name: 'type', value: 'creator_approved' }],
    });
    expect(sendEmail.mock.calls[0][0].react.props).toEqual({
      firstName: 'Vicky',
      dashboardUrl: 'https://influenceit.app/creator-dashboard',
    });
  });

  it('falls back to the scraped name when the profile has none', async () => {
    const admin = makeAdmin({
      authUser: { email: 'creator@example.com' },
      tables: {
        creator_profiles: { data: { display_name: null, creator_id: 'c-1' } },
        creators: { data: { display_name: 'Ana María' } },
      },
    });

    await sendCreatorApproved(admin as never, 'profile-1');

    expect(sendEmail.mock.calls[0][0].react.props.firstName).toBe('Ana');
  });

  it('reports failed, and sends nothing, when the auth user has no email', async () => {
    const admin = makeAdmin({
      authUser: null,
      authError: { message: 'User not found' },
      tables: {},
    });

    const outcome = await sendCreatorApproved(admin as never, 'profile-1');

    expect(outcome).toEqual({ email: 'failed', error: 'User not found' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('reports failed when Resend refuses', async () => {
    sendEmail.mockResolvedValue({ ok: false, error: 'rate limited' });
    const admin = makeAdmin({
      authUser: { email: 'creator@example.com' },
      tables: { creator_profiles: { data: { display_name: 'V', creator_id: null } } },
    });

    const outcome = await sendCreatorApproved(admin as never, 'profile-1');

    expect(outcome).toEqual({ email: 'failed', error: 'rate limited' });
  });

  it('never throws: a lookup that throws comes back as failed', async () => {
    const admin = makeAdmin({
      authUser: { email: 'creator@example.com' },
      tables: {}, // `from('creator_profiles')` throws inside the double
    });

    const outcome = await sendCreatorApproved(admin as never, 'profile-1');

    expect(outcome).toEqual({
      email: 'failed',
      error: 'test double has no script for table "creator_profiles"',
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

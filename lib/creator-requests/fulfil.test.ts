import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * fulfilRequest() against a hand-rolled Supabase double.
 *
 * Two things have to be faked and nothing else:
 *
 *  - `lib/email/client`, so a test never reaches Resend. Mocked at the module
 *    boundary rather than by unsetting RESEND_API_KEY, because "not
 *    configured" is its own branch and would prove the wrong thing.
 *  - The admin client, as a tiny builder that records what was asked for. The
 *    point of the TikTok test below is WHICH social_profiles row is looked up,
 *    so the filters have to be observable, not just the result.
 *
 * `server-only` at the top of fulfil.ts is handled by the alias in
 * vitest.config.ts.
 */

const sendEmail = vi.fn();

vi.mock('@/lib/email/client', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
  SITE_URL: 'https://influenceit.app',
  maskEmail: (a: string) => `${a[0]}***`,
}));

const { fulfilRequest } = await import('./fulfil');

/** One `.eq()` filter recorded off a query chain. */
type Filter = { column: string; value: unknown };

type TableScript = {
  /** What the chain resolves to. */
  result: { data?: unknown; error?: { message: string } | null };
  /** Filled in by the double as the chain is built. */
  filters: Filter[];
  /** The payload passed to .update(), if any. */
  update?: Record<string, unknown>;
};

function makeAdmin(tables: Record<string, TableScript>) {
  return {
    from(table: string) {
      const script = tables[table];
      if (!script) throw new Error(`test double has no script for table "${table}"`);

      // Every chain method returns the same object; the terminal methods
      // resolve. That is enough for this module, which only ever builds
      // select/eq/limit/maybeSingle and update/eq/select chains.
      const chain: Record<string, unknown> = {
        select: () => chain,
        insert: (payload: Record<string, unknown>) => {
          script.update = payload;
          return Promise.resolve(script.result);
        },
        update(payload: Record<string, unknown>) {
          script.update = payload;
          return chain;
        },
        eq(column: string, value: unknown) {
          script.filters.push({ column, value });
          return chain;
        },
        limit: () => chain,
        maybeSingle: () => Promise.resolve(script.result),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve(script.result).then(resolve),
      };
      return chain;
    },
  };
}

const tiktokRow = { id: 'req-1', platform: 'tiktok', handle: 'lmg.media', email: 'creator@example.com' };

beforeEach(() => {
  sendEmail.mockReset();
  sendEmail.mockResolvedValue({ ok: true, id: 'resend-1' });
});

describe('fulfilRequest — TikTok', () => {
  it('fulfils a TikTok request when a social_profiles row with platform tiktok exists', async () => {
    const tables: Record<string, TableScript> = {
      social_profiles: { result: { data: { creator_id: 'creator-9' }, error: null }, filters: [] },
      creator_requests: { result: { data: [{ id: 'req-1' }], error: null }, filters: [] },
      activity_log: { result: { data: null, error: null }, filters: [] },
    };

    const result = await fulfilRequest(makeAdmin(tables) as never, tiktokRow, null);

    expect(result.outcome).toBe('sent');
    expect(result.creatorId).toBe('creator-9');

    // Matched on (platform, handle), not handle alone — otherwise a TikTok
    // request could be closed by an Instagram creator who happens to share
    // the handle, and 72 handles in this database do exactly that.
    expect(tables.social_profiles.filters).toEqual([
      { column: 'handle', value: 'lmg.media' },
      { column: 'platform', value: 'tiktok' },
    ]);

    // Claim-then-send: flipped to 'added' with the creator_id, guarded on the
    // row still being open.
    expect(tables.creator_requests.update).toMatchObject({ status: 'added', creator_id: 'creator-9' });
    expect(tables.creator_requests.filters).toEqual([
      { column: 'id', value: 'req-1' },
      { column: 'status', value: 'new' },
    ]);

    // And the creator got the claim link.
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toMatchObject({
      to: 'creator@example.com',
      replyTo: process.env.ADMIN_EMAIL,
    });
    expect(sendEmail.mock.calls[0][0].react.props).toMatchObject({
      handle: 'lmg.media',
      claimUrl: 'https://influenceit.app/claim/lmg.media',
    });
  });

  it('leaves a TikTok request open when only an INSTAGRAM row shares the handle', async () => {
    // The platform filter is what produces this: the lookup finds nothing, so
    // nothing is flipped and nothing is sent.
    const tables: Record<string, TableScript> = {
      social_profiles: { result: { data: null, error: null }, filters: [] },
      creator_requests: { result: { data: [], error: null }, filters: [] },
      activity_log: { result: { data: null, error: null }, filters: [] },
    };

    const result = await fulfilRequest(makeAdmin(tables) as never, tiktokRow, null);

    expect(result.outcome).toBe('not_in_database');
    expect(tables.creator_requests.update).toBeUndefined();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('refuses a platform it does not understand, before any lookup', async () => {
    const tables: Record<string, TableScript> = {
      social_profiles: { result: { data: { creator_id: 'creator-9' }, error: null }, filters: [] },
      creator_requests: { result: { data: [{ id: 'req-1' }], error: null }, filters: [] },
      activity_log: { result: { data: null, error: null }, filters: [] },
    };

    const result = await fulfilRequest(
      makeAdmin(tables) as never,
      { ...tiktokRow, platform: 'youtube' },
      null,
    );

    expect(result.outcome).toBe('platform_disabled');
    expect(tables.social_profiles.filters).toEqual([]);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

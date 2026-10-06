import { describe, expect, it } from 'vitest';
import { countByTypeAndPlatform, runCreatorEntityApply, topByFollowers, type AppliedChange } from './apply';
import type { PipelineClient } from '../pipeline/types';

/**
 * runCreatorEntityApply only calls apply_creator_entity() and joins
 * creator_entity back on; the rule itself is SQL and is not exercised here.
 * The fake records every rpc call so chunking and the dry-run flag can be
 * checked, and answers with whatever the test says the function returned.
 */
type RpcCall = { fn: string; args: { p_ids: string[]; p_dry_run: boolean } };

function fakeClient(options: {
  creatorIds: string[];
  /** What apply_creator_entity returns for a chunk; may throw-like with an error. */
  respond: (ids: string[], call: number) => { data: unknown[] | null; error: { message: string } | null };
  entities: Record<string, unknown>[];
}) {
  const rpcCalls: RpcCall[] = [];
  const client = {
    rpc(fn: string, args: RpcCall['args']) {
      rpcCalls.push({ fn, args });
      return Promise.resolve(options.respond(args.p_ids, rpcCalls.length));
    },
    from(table: string) {
      if (table === 'creators') {
        return {
          select: () => {
            const state = { gt: null as string | null };
            const q = {
              gt(_c: string, v: string) { state.gt = v; return q; },
              order: () => ({
                limit: (n: number) =>
                  Promise.resolve({
                    data: options.creatorIds
                      .filter((id) => state.gt === null || id > state.gt)
                      .sort()
                      .slice(0, n)
                      .map((id) => ({ id })),
                    error: null,
                  }),
              }),
            };
            return q;
          },
        };
      }
      if (table === 'creator_entity') {
        return {
          select: () => ({
            in: (_c: string, ids: string[]) =>
              Promise.resolve({ data: options.entities.filter((e) => ids.includes(e.creator_id as string)), error: null }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as PipelineClient;
  return { client, rpcCalls };
}

const ids = (n: number) => Array.from({ length: n }, (_, i) => `c-${String(i).padStart(5, '0')}`);

function entity(id: string, extra: Partial<Record<string, unknown>> = {}) {
  return {
    creator_id: id,
    entity_type: 'brand',
    confidence: 'high',
    flag_count: 2,
    reason: 'Official brand account',
    review_entity_type: null,
    inputs: { platform: 'instagram', handle: id, follower_count: 1000 },
    ...extra,
  };
}

describe('runCreatorEntityApply', () => {
  it('is a dry run by default and calls the function in chunks of 1000 explicit ids', async () => {
    const all = ids(2500);
    const { client, rpcCalls } = fakeClient({ creatorIds: all, respond: () => ({ data: [], error: null }), entities: [] });
    const result = await runCreatorEntityApply(client);
    expect(result.write).toBe(false);
    expect(result.checked).toBe(2500);
    expect(rpcCalls.map((c) => c.fn)).toEqual(['apply_creator_entity', 'apply_creator_entity', 'apply_creator_entity']);
    expect(rpcCalls.map((c) => c.args.p_ids.length)).toEqual([1000, 1000, 500]);
    expect(rpcCalls.every((c) => c.args.p_dry_run === true)).toBe(true);
    expect(rpcCalls.flatMap((c) => c.args.p_ids)).toEqual(all);
  });

  it('passes p_dry_run false only with write, and only the given ids', async () => {
    const { client, rpcCalls } = fakeClient({ creatorIds: ids(10), respond: () => ({ data: [], error: null }), entities: [] });
    await runCreatorEntityApply(client, { write: true, ids: ['c-00003', 'c-00007'] });
    expect(rpcCalls).toEqual([{ fn: 'apply_creator_entity', args: { p_ids: ['c-00003', 'c-00007'], p_dry_run: false } }]);
  });

  it('joins creator_entity onto each change, effective type first', async () => {
    const { client } = fakeClient({
      creatorIds: ids(3),
      respond: () => ({
        data: [
          { creator_id: 'c-00000', from_status: 'active', to_status: 'non_creator' },
          { creator_id: 'c-00001', from_status: 'non_creator', to_status: 'active' },
          { creator_id: 'c-00002', from_status: 'non_creator', to_status: 'active' },
        ],
        error: null,
      }),
      entities: [entity('c-00000'), entity('c-00001', { review_entity_type: 'creator' })],
    });
    const { changes } = await runCreatorEntityApply(client);
    expect(changes.map((c) => [c.creator_id, c.effectiveType, c.reviewed])).toEqual([
      ['c-00000', 'brand', false],
      ['c-00001', 'creator', true],
      ['c-00002', null, false], // no creator_entity row: the rule reads it as active
    ]);
  });

  it('keeps going past a failed chunk and reports it', async () => {
    const { client } = fakeClient({
      creatorIds: ids(2001),
      respond: (_ids, call) =>
        call === 2
          ? { data: null, error: { message: 'canceling statement due to statement timeout' } }
          : { data: [{ creator_id: `c-0000${call}`, from_status: 'active', to_status: 'non_creator' }], error: null },
      entities: [],
    });
    const result = await runCreatorEntityApply(client, { write: true });
    expect(result.failedChunks).toBe(1);
    expect(result.errors).toEqual(['canceling statement due to statement timeout']);
    expect(result.changes.map((c) => c.creator_id)).toEqual(['c-00001', 'c-00003']);
  });
});

describe('report helpers', () => {
  const change = (id: string, to: string, type: string | null, platform: string | null, followers: number | null): AppliedChange => ({
    creator_id: id,
    from_status: to === 'active' ? 'non_creator' : 'active',
    to_status: to,
    effectiveType: type as AppliedChange['effectiveType'],
    reviewed: false,
    confidence: 'high',
    flagCount: 1,
    reason: null,
    inputs: platform ? ({ platform, handle: id, follower_count: followers } as AppliedChange['inputs']) : null,
  });
  const changes = [
    change('a', 'non_creator', 'brand', 'instagram', 500),
    change('b', 'non_creator', 'brand', 'instagram', 9000),
    change('c', 'non_creator', 'media', 'tiktok', null),
    change('d', 'active', 'creator', 'tiktok', 100000),
    change('e', 'non_creator', 'venue', null, null),
  ];

  it('counts by effective type and platform for one direction, largest first', () => {
    expect([...countByTypeAndPlatform(changes, 'non_creator')]).toEqual([
      ['brand / instagram', 2],
      ['media / tiktok', 1],
      ['venue / no profile', 1],
    ]);
    expect([...countByTypeAndPlatform(changes, 'active')]).toEqual([['creator / tiktok', 1]]);
  });

  it('lists the most-followed changes in one direction, unknown follower counts last', () => {
    expect(topByFollowers(changes, 'non_creator', 3).map((c) => c.creator_id)).toEqual(['b', 'a', 'c']);
  });
});

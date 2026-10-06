import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashInputs } from './classify';
import { planRehash, rehashDecision, writeRehash, type RehashPlanItem } from './rehash';
import type { CreatorEntityInputs } from './types';
import type { PipelineClient } from '../pipeline/types';

const inputs: CreatorEntityInputs = {
  platform: 'instagram',
  handle: 'relbeauty',
  display_name: 'Rel Beauty',
  follower_count: 59253,
  bio: 'clean beauty',
  category: 'Health/beauty',
  is_business_account: true,
  link_domain: 'relbeauty.com',
  summary: 'A skincare brand account.',
};

/** The hash before 2026-10-06: every key, follower_count included. */
function oldHash(i: CreatorEntityInputs): string {
  return createHash('sha256').update(JSON.stringify(i, Object.keys(i).sort())).digest('hex');
}

describe('rehashDecision', () => {
  it('rewrites an old-scheme hash when nothing changed', () => {
    const item = rehashDecision({ creator_id: 'a', inputs, input_hash: oldHash(inputs) }, inputs);
    expect(item).toEqual({ creatorId: 'a', decision: 'rewrite', from: oldHash(inputs), to: hashInputs(inputs) });
  });

  it('rewrites when only the follower count moved since the verdict — the case this exists for', () => {
    const today = { ...inputs, follower_count: 61000 };
    // Under the old scheme this row would read as changed and cost a model call.
    expect(oldHash(today)).not.toBe(oldHash(inputs));
    expect(rehashDecision({ creator_id: 'a', inputs, input_hash: oldHash(inputs) }, today).decision).toBe('rewrite');
  });

  it('leaves a row alone when something the model reads changed', () => {
    const today = { ...inputs, bio: 'personal vlog' };
    expect(rehashDecision({ creator_id: 'a', inputs, input_hash: oldHash(inputs) }, today).decision).toBe('changed');
  });

  it('reports a row already on the current scheme as current, so a rerun writes nothing', () => {
    expect(rehashDecision({ creator_id: 'a', inputs, input_hash: hashInputs(inputs) }, { ...inputs, follower_count: 1 }).decision).toBe('current');
  });
});

describe('planRehash', () => {
  it('plans every stored row and lists the ones with no creator', () => {
    const plan = planRehash(
      [
        { creator_id: 'a', inputs, input_hash: oldHash(inputs) },
        { creator_id: 'gone', inputs, input_hash: oldHash(inputs) },
      ],
      new Map([['a', inputs]]),
    );
    expect(plan.items.map((i) => [i.creatorId, i.decision])).toEqual([['a', 'rewrite']]);
    expect(plan.noRecord).toEqual(['gone']);
  });
});

describe('writeRehash', () => {
  type Call = { table: string; patch: unknown; filters: [string, string, unknown][]; select: string | null };

  function fakeClient(respond: (call: Call) => { data: unknown[] | null; error: { message: string } | null }) {
    const calls: Call[] = [];
    const client = {
      from(table: string) {
        return {
          update(patch: unknown) {
            const call: Call = { table, patch, filters: [], select: null };
            calls.push(call);
            const chain = {
              eq(column: string, value: unknown) { call.filters.push(['eq', column, value]); return chain; },
              is(column: string, value: unknown) { call.filters.push(['is', column, value]); return chain; },
              select(columns: string) { call.select = columns; return Promise.resolve(respond(call)); },
            };
            return chain;
          },
        };
      },
    } as unknown as PipelineClient;
    return { client, calls };
  }

  const items: RehashPlanItem[] = [
    { creatorId: 'a', decision: 'rewrite', from: 'old-a', to: 'new-a' },
    { creatorId: 'b', decision: 'current', from: 'new-b', to: 'new-b' },
    { creatorId: 'c', decision: 'changed', from: 'old-c', to: 'new-c' },
    { creatorId: 'd', decision: 'rewrite', from: null, to: 'new-d' },
  ];

  it('rewrites only input_hash, only for rewrite items, guarded on the stored hash', async () => {
    const { client, calls } = fakeClient(() => ({ data: [{ creator_id: 'x' }], error: null }));
    const result = await writeRehash(client, items);
    expect(result).toEqual({ written: 2, skipped: 0, failed: 0, errors: [] });
    expect(calls.map((c) => [c.table, c.patch, c.filters])).toEqual([
      ['creator_entity', { input_hash: 'new-a' }, [['eq', 'creator_id', 'a'], ['eq', 'input_hash', 'old-a']]],
      ['creator_entity', { input_hash: 'new-d' }, [['eq', 'creator_id', 'd'], ['is', 'input_hash', null]]],
    ]);
  });

  it('counts a row changed since it was read as skipped, and a write error as failed', async () => {
    const { client } = fakeClient((call) =>
      call.filters[0][2] === 'a' ? { data: [], error: null } : { data: null, error: { message: 'boom' } },
    );
    expect(await writeRehash(client, items)).toEqual({ written: 0, skipped: 1, failed: 1, errors: ['boom'] });
  });
});

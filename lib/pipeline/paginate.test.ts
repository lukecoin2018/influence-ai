import { describe, expect, it } from 'vitest';
import { paginate, type KeysetQuery } from './paginate';
import { aggregateDetectedBrands } from './aggregate';
import type { PipelineClient } from './types';

/**
 * Keyset pagination must visit every row exactly once, in key order, however
 * the storage happens to hand rows back — that is the property the OFFSET
 * scan lacked. The fake table below returns rows in a different physical
 * order on every call (a stand-in for a heap being rewritten under the scan),
 * and the builder honours gt / order / limit the way PostgREST does.
 */

type Row = Record<string, unknown> & { id: string };

function shuffled<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Reads `a.b` off a row the way PostgREST resolves a filter on an embedded resource. */
function pathValue(row: Row, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown> | null | undefined)?.[key], row);
}

/**
 * A PostgREST-shaped builder over an in-memory table whose physical order
 * changes every call. `eq` filters rows, including on an embedded column
 * (`creators.status`) as an `!inner` embed does.
 */
function fakeTable(rows: Row[]) {
  let call = 0;
  const calls: { gt: string | number | null; order: string | null; limit: number | null }[] = [];
  function builder(): KeysetQuery<Row> & { eq: (column: string, value: unknown) => KeysetQuery<Row> } {
    const state = { gt: null as string | number | null, order: null as string | null, limit: null as number | null };
    const filters: { column: string; value: unknown }[] = [];
    calls.push(state);
    const physical = shuffled(rows, ++call);
    const q: KeysetQuery<Row> & { eq: (column: string, value: unknown) => KeysetQuery<Row> } = {
      eq(column, value) { filters.push({ column, value }); return q; },
      gt(_column, value) { state.gt = value; return q; },
      order(column) {
        state.order = column;
        return {
          limit(count) {
            state.limit = count;
            const key = column as keyof Row;
            const data = physical
              .filter((r) => filters.every((f) => pathValue(r, f.column) === f.value))
              .filter((r) => state.gt === null || String(r[key]) > String(state.gt))
              .sort((a, b) => String(a[key]).localeCompare(String(b[key])))
              .slice(0, count);
            return Promise.resolve({ data, error: null });
          },
        };
      },
    };
    return q;
  }
  return { builder, calls };
}

function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `id-${String(i).padStart(5, '0')}`);
}

describe('paginate (keyset)', () => {
  it('visits every row exactly once, in key order, across pages', async () => {
    const rows: Row[] = ids(2501).map((id) => ({ id }));
    const { builder, calls } = fakeTable(rows);
    const seen: string[] = [];
    await paginate(builder, { key: 'id', pageSize: 1000 }, (page) => { seen.push(...page.map((r) => r.id)); });
    expect(seen).toEqual(ids(2501));
    expect(calls.map((c) => c.gt)).toEqual([null, 'id-00999', 'id-01999']);
    expect(calls.every((c) => c.order === 'id' && c.limit === 1000)).toBe(true);
  });

  it('stops after a short page without an extra request, and makes no second request for an exact multiple', async () => {
    const { builder, calls } = fakeTable(ids(2000).map((id) => ({ id })));
    await paginate(builder, { key: 'id', pageSize: 1000 }, () => {});
    // 1000, 1000, then an empty page to learn there is nothing more.
    expect(calls.length).toBe(3);
  });

  it('throws when the select does not include the key column', async () => {
    const { builder } = fakeTable(ids(1001).map((id) => ({ id, other: 1 })));
    await expect(paginate(builder, { key: 'missing' as never, pageSize: 1000 }, () => {})).rejects.toThrow(/key column "missing"/);
  });

  it('surfaces a page error', async () => {
    const failing = (): KeysetQuery<Row> => ({
      gt() { return failing(); },
      order() { return { limit: () => Promise.resolve({ data: null, error: { message: 'canceling statement due to statement timeout' } }) }; },
    });
    await expect(paginate(failing, { key: 'id' }, () => {})).rejects.toThrow('statement timeout');
  });
});

describe('aggregateDetectedBrands is deterministic', () => {
  function fakeClient(profiles: Row[], posts: Row[]): PipelineClient {
    const tables: Record<string, ReturnType<typeof fakeTable>> = {
      social_profiles: fakeTable(profiles),
      creator_posts: fakeTable(posts),
    };
    return {
      from(table: string) {
        return { select: () => tables[table].builder() };
      },
    } as unknown as PipelineClient;
  }

  it('returns identical alias stats across two runs over a table whose physical order changes', async () => {
    const profiles: Row[] = ids(30).map((id, i) => ({ id, creator_id: `creator-${i % 7}`, creators: { status: 'active' } }));
    const brands = ['nike', 'Adidas ', 'zara', 'gymshark', 'shein', 'puma', 'lululemon'];
    const posts: Row[] = Array.from({ length: 2345 }, (_, i) => ({
      id: `post-${String(i).padStart(5, '0')}`,
      social_profile_id: profiles[i % profiles.length].id,
      detected_brands: i % 5 === 0 ? [] : [brands[i % brands.length], brands[(i * 3) % brands.length]],
    }));

    const run = async () => {
      const stats = await aggregateDetectedBrands(fakeClient(profiles, posts));
      return [...stats.entries()].map(([alias, s]) => [alias, s.posts, [...s.creatorIds].sort().join(',')]);
    };
    const first = await run();
    const second = await run();
    expect(first).toEqual(second);
    expect(first.length).toBe(7);
    expect(first.find(([alias]) => alias === 'adidas')).toBeDefined(); // normalised: trimmed, lowercased
    const totalPosts = first.reduce((sum, [, posts]) => sum + (posts as number), 0);
    expect(totalPosts).toBeGreaterThan(0);
  });

  it('counts only active creators\' posts — a hidden account adds nothing, not even under a stand-in id', async () => {
    const profiles: Row[] = [
      { id: 'p-active', creator_id: 'creator-a', creators: { status: 'active' } },
      { id: 'p-hidden', creator_id: 'creator-h', creators: { status: 'non_creator' } },
    ];
    const posts: Row[] = [
      { id: 'post-1', social_profile_id: 'p-active', detected_brands: ['glowery'] },
      { id: 'post-2', social_profile_id: 'p-hidden', detected_brands: ['glowery'] },
      { id: 'post-3', social_profile_id: 'p-hidden', detected_brands: ['glowery', 'sephora'] },
    ];
    const stats = await aggregateDetectedBrands(fakeClient(profiles, posts));
    expect(stats.get('glowery')).toEqual({ posts: 1, creatorIds: new Set(['creator-a']) });
    expect(stats.has('sephora')).toBe(false);
  });
});

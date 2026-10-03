import { describe, expect, it } from 'vitest';
import { loadBatchPostCounts, pgTextArrayLiteral } from './classify';
import type { PipelineClient } from './types';

/**
 * The per-batch context query that replaced classify's full creator_posts
 * scan: the array literal it sends must survive any alias string, and the
 * counting must match what the aggregation did — one count per alias per
 * post, normalised, limited to the aliases asked for.
 */

describe('pgTextArrayLiteral', () => {
  it('double-quotes every element', () => {
    expect(pgTextArrayLiteral(['nike', 'foot locker'])).toBe('{"nike","foot locker"}');
  });
  it('escapes backslashes and double quotes, and leaves commas and braces inside quotes', () => {
    expect(pgTextArrayLiteral(['a,b', 'say "hi"', 'back\\slash', '{brace}'])).toBe('{"a,b","say \\"hi\\"","back\\\\slash","{brace}"}');
  });
  it('is an empty literal for no values', () => {
    expect(pgTextArrayLiteral([])).toBe('{}');
  });
});

describe('loadBatchPostCounts', () => {
  type Post = { id: string; detected_brands: unknown };

  function fakeClient(posts: Post[]) {
    const filters: { column: string; literal: string }[] = [];
    const client = {
      from() {
        return {
          select() {
            let literal = '';
            const q = {
              overlaps(column: string, value: string) { literal = value; filters.push({ column, literal: value }); return q; },
              gt(_c: string, v: string) { posts = posts.filter((p) => p.id > v); return q; },
              order() {
                return {
                  limit(n: number) {
                    // Emulate `detected_brands && aliases` for the literal we were given.
                    const aliases = literal.slice(1, -1).split(',').filter(Boolean).map((s) => s.replace(/^"|"$/g, ''));
                    const data = posts
                      .filter((p) => Array.isArray(p.detected_brands) && p.detected_brands.some((b) => aliases.includes(String(b))))
                      .sort((a, b) => a.id.localeCompare(b.id))
                      .slice(0, n);
                    return Promise.resolve({ data, error: null });
                  },
                };
              },
            };
            return q;
          },
        };
      },
    } as unknown as PipelineClient;
    return { client, filters };
  }

  it('counts each post once per alias it names, normalising raw values, and reports zero for aliases with no posts', async () => {
    const { client, filters } = fakeClient([
      { id: 'p1', detected_brands: ['nike', 'zara'] },
      { id: 'p2', detected_brands: ['nike', 'nike', 'NIKE '] }, // duplicates within a post count once
      { id: 'p3', detected_brands: ['zara'] },
      { id: 'p4', detected_brands: ['puma'] }, // not in the batch: never counted
      { id: 'p5', detected_brands: null },
    ]);
    const counts = await loadBatchPostCounts(client, ['nike', 'zara', 'ghost']);
    expect([...counts.entries()]).toEqual([['nike', 2], ['zara', 2], ['ghost', 0]]);
    expect(filters).toEqual([{ column: 'detected_brands', literal: '{"nike","zara","ghost"}' }]);
  });

  it('makes no request for an empty batch', async () => {
    const { client, filters } = fakeClient([]);
    expect([...(await loadBatchPostCounts(client, [])).entries()]).toEqual([]);
    expect(filters).toEqual([]);
  });
});

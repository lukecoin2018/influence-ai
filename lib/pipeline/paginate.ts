/**
 * Keyset pagination over a PostgREST query.
 *
 * Pages are read in `key` order (`id` for uuid tables, `alias` for
 * brand_aliases), `pageSize` rows at a time, each page continuing from the
 * last key of the previous one (`key > last`). Two properties follow, and both
 * were missing from the OFFSET pagination this replaces:
 *
 *  1. Deterministic. An OFFSET scan with no ORDER BY has no stable row order,
 *     so pages overlapped and skipped under concurrent writes: the same
 *     unchanged creator_posts table read twice 25 seconds apart on 2026-10-03
 *     gave 23,556 and then 23,929 distinct aliases. Ordered keyset pages
 *     visit every row exactly once.
 *  2. Constant cost per page. OFFSET 240000 makes Postgres walk and discard
 *     240,000 rows before returning the page, which is what pushed the deep
 *     pages of the creator_posts scan past the statement timeout on
 *     2026-10-03 (classify failed at 1m22s). `key > last ORDER BY key LIMIT n`
 *     is an index range scan on the primary key regardless of depth.
 *
 * `buildQuery` must return a FRESH builder each call (supabase-js builders are
 * single-use) with its filters applied; this helper adds the cursor, the order
 * and the limit. The select must include the key column.
 */
export type KeysetPage<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export type KeysetQuery<T> = {
  gt: (column: string, value: string | number) => KeysetQuery<T>;
  order: (column: string, options?: { ascending?: boolean }) => { limit: (count: number) => KeysetPage<T> };
};

export type PaginateOptions<T> = {
  /** Column to key on. Must be unique, totally ordered, and present in the select. */
  key: keyof T & string;
  pageSize?: number;
};

export const DEFAULT_PAGE_SIZE = 1000;

export async function paginate<T extends Record<string, unknown>>(
  buildQuery: () => KeysetQuery<T>,
  options: PaginateOptions<T>,
  onPage: (rows: T[]) => void | Promise<void>,
): Promise<void> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  let last: string | number | null = null;
  for (;;) {
    let query = buildQuery();
    if (last !== null) query = query.gt(options.key, last);
    const { data, error } = await query.order(options.key, { ascending: true }).limit(pageSize);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    await onPage(data);
    if (data.length < pageSize) break;
    const cursor = data[data.length - 1][options.key];
    if (typeof cursor !== 'string' && typeof cursor !== 'number') {
      throw new Error(`paginate: key column "${options.key}" is missing from the select or is not a string/number`);
    }
    last = cursor;
  }
}

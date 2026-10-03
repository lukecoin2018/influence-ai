/**
 * Pages through a PostgREST query in chunks. `buildQuery` must return a FRESH
 * query builder each call (supabase-js builders are single-use); `.range()` is
 * applied here. Moved unchanged from scripts/brand-brackets/_supabase.ts and
 * scripts/brand-aliases/_supabase.mjs so both script folders and the future
 * admin route share one copy.
 */
export type RangeQuery<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
};

export async function paginate<T>(
  buildQuery: () => RangeQuery<T>,
  pageSize: number,
  onPage: (rows: T[]) => void | Promise<void>,
): Promise<void> {
  let offset = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    await onPage(data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
}

import type { PipelineClient, PipelineOptions } from '../pipeline/types';
import { noopProgress } from '../pipeline/types';
import { paginate } from '../pipeline/paginate';
import { loadCreatorRecords } from './load';
import { computeSignals } from './heuristics';
import { buildInputs, hashInputs } from './classify';
import type { CreatorEntityInputs } from './types';

/**
 * Rewrites creator_entity.input_hash to what hashInputs() computes today, for
 * rows whose verdict still stands, without calling the model — the step that
 * must follow any change to what hashInputs() covers (on 2026-10-06,
 * follower_count left the hash). Run it before the next classify run; a
 * classify run in between would see every stored hash as stale and re-classify
 * everything.
 *
 * For each stored row it compares, under the CURRENT scheme, the hash of the
 * stored inputs (what the model saw) with the hash of today's inputs:
 *  - equal → `rewrite`: nothing the hash covers has changed since the verdict,
 *    so the verdict stands and only input_hash is rewritten;
 *  - different → `changed`: something the model reads really changed, so the
 *    row is left alone and the next classify run re-classifies it, as it would
 *    have anyway;
 *  - stored hash already equals today's → `current`: nothing to do (a rerun).
 * Comparing against the stored inputs, not the old-scheme hash, is the point:
 * if a re-scrape moved follower counts before this runs, an old-scheme
 * comparison would miss exactly the rows the change exists to protect.
 *
 * Writes only input_hash, guarded on the stored value so a row a classify run
 * rewrote in the meantime is left as that run left it.
 */
const IN_FLIGHT = 10;

export type RehashDecision = 'current' | 'rewrite' | 'changed';

export type StoredHashRow = { creator_id: string; inputs: CreatorEntityInputs; input_hash: string | null };

export type RehashPlanItem = { creatorId: string; decision: RehashDecision; from: string | null; to: string };

export type RehashPlan = {
  items: RehashPlanItem[];
  /** Stored rows whose creator no longer loads (none expected: the row is deleted with its creator). */
  noRecord: string[];
};

export function rehashDecision(stored: StoredHashRow, current: CreatorEntityInputs): RehashPlanItem {
  const to = hashInputs(current);
  const decision: RehashDecision =
    stored.input_hash === to ? 'current' : hashInputs(stored.inputs) === to ? 'rewrite' : 'changed';
  return { creatorId: stored.creator_id, decision, from: stored.input_hash, to };
}

export function planRehash(stored: readonly StoredHashRow[], currentById: ReadonlyMap<string, CreatorEntityInputs>): RehashPlan {
  const items: RehashPlanItem[] = [];
  const noRecord: string[] = [];
  for (const row of stored) {
    const current = currentById.get(row.creator_id);
    if (!current) noRecord.push(row.creator_id);
    else items.push(rehashDecision(row, current));
  }
  return { items, noRecord };
}

export type RehashWriteResult = { written: number; skipped: number; failed: number; errors: string[] };

/** Rewrites input_hash for the `rewrite` items, guarded on the stored value. */
export async function writeRehash(client: PipelineClient, items: readonly RehashPlanItem[]): Promise<RehashWriteResult> {
  const rewrites = items.filter((item) => item.decision === 'rewrite');
  const result: RehashWriteResult = { written: 0, skipped: 0, failed: 0, errors: [] };
  let next = 0;
  async function worker() {
    while (next < rewrites.length) {
      const item = rewrites[next++];
      const base = client.from('creator_entity').update({ input_hash: item.to }).eq('creator_id', item.creatorId);
      const guarded = item.from === null ? base.is('input_hash', null) : base.eq('input_hash', item.from);
      const { data, error } = await guarded.select('creator_id');
      if (error) {
        result.failed++;
        result.errors.push(error.message);
      } else if (!data || data.length === 0) {
        result.skipped++; // rewritten by someone else since it was read
      } else {
        result.written++;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(IN_FLIGHT, rewrites.length) }, worker));
  return result;
}

export type RehashResult = RehashPlan & { write: boolean; counts: Record<RehashDecision, number>; writeResult: RehashWriteResult | null };

export async function runCreatorEntityRehash(client: PipelineClient, options: PipelineOptions & { write?: boolean } = {}): Promise<RehashResult> {
  const onProgress = options.onProgress ?? noopProgress;
  const write = options.write ?? false;

  onProgress('Loading stored creator_entity rows...');
  const stored: StoredHashRow[] = [];
  await paginate<StoredHashRow>(
    () => client.from('creator_entity').select('creator_id, inputs, input_hash'),
    { key: 'creator_id', pageSize: 1000 },
    (page) => {
      stored.push(...page);
    },
  );
  onProgress(`  ${stored.length} rows.`);

  const records = await loadCreatorRecords(client, { onProgress });
  const currentById = new Map(records.map((record) => [record.creatorId, buildInputs(record, computeSignals(record))]));

  const plan = planRehash(stored, currentById);
  const counts: Record<RehashDecision, number> = { current: 0, rewrite: 0, changed: 0 };
  for (const item of plan.items) counts[item.decision]++;
  onProgress(
    `Plan: ${counts.rewrite} to rewrite, ${counts.current} already current, ${counts.changed} with changed inputs (left for the next classify run)` +
      (plan.noRecord.length > 0 ? `, ${plan.noRecord.length} with no creator` : '') +
      '.',
  );

  let writeResult: RehashWriteResult | null = null;
  if (write && counts.rewrite > 0) {
    onProgress(`Rewriting input_hash on ${counts.rewrite} row(s)...`);
    writeResult = await writeRehash(client, plan.items);
  }
  return { ...plan, write, counts, writeResult };
}

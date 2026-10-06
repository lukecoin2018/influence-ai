import type { PipelineClient, PipelineOptions } from '../pipeline/types';
import { noopProgress } from '../pipeline/types';
import { paginate } from '../pipeline/paginate';
import type { CreatorEntityConfidence, CreatorEntityInputs, CreatorEntityStatusChange, CreatorEntityType } from './types';

/**
 * Runs apply_creator_entity() (supabase/migrations/0027_creator_exclusion.sql)
 * over creators and reports what changed — the logic behind
 * `npm run creator-entity:apply` and `creator-entity:classify --apply`.
 *
 * The rule is not here. It lives in that SQL function; this only calls it and
 * joins the creator_entity rows back on for the report.
 *
 * Called in chunks of explicit ids rather than once with p_ids = null: the
 * function returns one row per change, and a write call's result cannot be
 * paged without calling it again (which would find nothing left to change).
 * Each chunk is its own transaction, so a failed chunk leaves the others
 * applied; rerunning picks it up.
 */
const CHUNK = 1000;
/** PostgREST `in.()` lists go in the URL. */
const IN_CHUNK = 200;

type StatusChange = CreatorEntityStatusChange;

type EntityRow = {
  creator_id: string;
  entity_type: CreatorEntityType;
  confidence: CreatorEntityConfidence;
  flag_count: number;
  reason: string;
  review_entity_type: CreatorEntityType | null;
  inputs: CreatorEntityInputs;
};

export type AppliedChange = StatusChange & {
  /** review_entity_type ?? entity_type, or null when the creator has no creator_entity row. */
  effectiveType: CreatorEntityType | null;
  reviewed: boolean;
  confidence: CreatorEntityConfidence | null;
  flagCount: number | null;
  reason: string | null;
  inputs: CreatorEntityInputs | null;
};

export type ApplyOptions = PipelineOptions & {
  /** Actually update creators.status and creator_entity.excluded. Default false (dry run). */
  write?: boolean;
  /** Only these creators. Default: every creator. */
  ids?: readonly string[] | null;
};

export type ApplyResult = {
  write: boolean;
  /** Creator ids sent to the function. */
  checked: number;
  changes: AppliedChange[];
  failedChunks: number;
  errors: string[];
};

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function loadAllCreatorIds(client: PipelineClient): Promise<string[]> {
  const ids: string[] = [];
  await paginate<{ id: string }>(
    () => client.from('creators').select('id'),
    { key: 'id', pageSize: 1000 },
    (page) => {
      ids.push(...page.map((r) => r.id));
    },
  );
  return ids;
}

async function loadEntityRows(client: PipelineClient, ids: readonly string[]): Promise<Map<string, EntityRow>> {
  const byId = new Map<string, EntityRow>();
  for (const part of chunk(ids, IN_CHUNK)) {
    const { data, error } = await client
      .from('creator_entity')
      .select('creator_id, entity_type, confidence, flag_count, reason, review_entity_type, inputs')
      .in('creator_id', part);
    if (error) throw new Error(`Loading creator_entity failed: ${error.message}`);
    for (const row of (data ?? []) as EntityRow[]) byId.set(row.creator_id, row);
  }
  return byId;
}

export async function runCreatorEntityApply(client: PipelineClient, options: ApplyOptions = {}): Promise<ApplyResult> {
  const onProgress = options.onProgress ?? noopProgress;
  const write = options.write ?? false;

  const ids = options.ids && options.ids.length > 0 ? [...options.ids] : await loadAllCreatorIds(client);
  onProgress(`Applying the exclusion rule to ${ids.length} creator(s)${write ? '' : ' — DRY RUN, nothing written'}...`);

  const raw: StatusChange[] = [];
  const errors: string[] = [];
  let failedChunks = 0;
  const parts = chunk(ids, CHUNK);
  for (let i = 0; i < parts.length; i++) {
    const { data, error } = await client.rpc('apply_creator_entity', { p_ids: parts[i], p_dry_run: !write });
    if (error) {
      failedChunks++;
      errors.push(error.message);
      onProgress(`  chunk ${i + 1}/${parts.length} failed: ${error.message}`);
      continue;
    }
    raw.push(...((data ?? []) as StatusChange[]));
    onProgress(`  ${Math.min((i + 1) * CHUNK, ids.length)}/${ids.length}`, true);
  }
  onProgress(`  ${raw.length} change(s)${write ? ' written' : ' would be written'}.`);

  const entities = await loadEntityRows(client, raw.map((c) => c.creator_id));
  const changes: AppliedChange[] = raw.map((change) => {
    const row = entities.get(change.creator_id);
    return {
      ...change,
      effectiveType: row ? row.review_entity_type ?? row.entity_type : null,
      reviewed: row?.review_entity_type != null,
      confidence: row?.confidence ?? null,
      flagCount: row?.flag_count ?? null,
      reason: row?.reason ?? null,
      inputs: row?.inputs ?? null,
    };
  });

  return { write, checked: ids.length, changes, failedChunks, errors };
}

/** Counts per `${effectiveType} / ${platform}` for the changes going to `toStatus`. */
export function countByTypeAndPlatform(changes: readonly AppliedChange[], toStatus: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const change of changes) {
    if (change.to_status !== toStatus) continue;
    const key = `${change.effectiveType ?? 'no verdict'} / ${change.inputs?.platform ?? 'no profile'}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Map([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

/** The `limit` changes going to `toStatus` with the most followers (from inputs), largest first. */
export function topByFollowers(changes: readonly AppliedChange[], toStatus: string, limit: number): AppliedChange[] {
  return changes
    .filter((c) => c.to_status === toStatus)
    .sort((a, b) => (b.inputs?.follower_count ?? -1) - (a.inputs?.follower_count ?? -1) || a.creator_id.localeCompare(b.creator_id))
    .slice(0, limit);
}

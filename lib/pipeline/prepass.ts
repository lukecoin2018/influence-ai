import type { PipelineClient, PipelineOptions } from './types';
import { noopProgress } from './types';
import { paginate } from './paginate';
import { COMMON_WORD_FRAGMENTS } from './stoplist';

/**
 * Step 2 of the brand-aliases pipeline — the non-AI classification pass. For
 * every unclassified alias (classified_at IS NULL): if it matches a
 * social_profiles.handle, it's a creator being @mentioned/tagged, not a brand
 * — classify as 'creator'. If it's a common word with no signal, classify as
 * 'fragment'. Everything else is left unclassified for the AI pass.
 * Idempotent: only ever touches classified_at IS NULL rows, so reruns are a
 * no-op for already-decided rows.
 *
 * Logic moved unchanged from scripts/brand-aliases/prepass.mjs.
 */
const PAGE_SIZE = 1000;
const UPDATE_BATCH_SIZE = 500;

export type PrepassResult = {
  /** Aliases with classified_at IS NULL at the start of the run. */
  unclassified: number;
  /** Aliases that matched a social_profiles.handle → entity_type 'creator'. */
  creatorMatches: number;
  /** Aliases that matched the common-word stoplist → entity_type 'fragment'. */
  fragmentMatches: number;
  /** Rows written (creatorMatches + fragmentMatches). */
  rowsUpdated: number;
  /** Aliases still unclassified afterwards, left for the AI pass. */
  remainingForAi: number;
};

type ProfileRow = { handle: string | null; creator_id: string };
type CreatorRow = { id: string; display_name: string | null };
type AliasRow = { alias: string };

async function loadHandleToCreatorName(client: PipelineClient): Promise<Map<string, string>> {
  const handleToCreatorId = new Map<string, string>();
  await paginate<ProfileRow>(
    () => client.from('social_profiles').select('handle, creator_id'),
    PAGE_SIZE,
    (rows) => {
      for (const row of rows) {
        if (row.handle) handleToCreatorId.set(row.handle.trim().toLowerCase(), row.creator_id);
      }
    },
  );

  const creatorIdToName = new Map<string, string | null>();
  await paginate<CreatorRow>(
    () => client.from('creators').select('id, display_name'),
    PAGE_SIZE,
    (rows) => {
      for (const row of rows) creatorIdToName.set(row.id, row.display_name);
    },
  );

  const handleToName = new Map<string, string>();
  for (const [handle, creatorId] of handleToCreatorId.entries()) {
    handleToName.set(handle, creatorIdToName.get(creatorId) ?? handle);
  }
  return handleToName;
}

async function loadUnclassifiedAliases(client: PipelineClient): Promise<string[]> {
  const aliases: string[] = [];
  await paginate<AliasRow>(
    () => client.from('brand_aliases').select('alias').is('classified_at', null),
    PAGE_SIZE,
    (rows) => {
      aliases.push(...rows.map((r) => r.alias));
    },
  );
  return aliases;
}

export async function runPrepass(client: PipelineClient, options: PipelineOptions = {}): Promise<PrepassResult> {
  const onProgress = options.onProgress ?? noopProgress;

  onProgress('Loading social_profiles handles and creator display names...');
  const handleToName = await loadHandleToCreatorName(client);
  onProgress(`  ${handleToName.size} handles loaded.`);

  onProgress('Loading unclassified aliases...');
  const aliases = await loadUnclassifiedAliases(client);
  onProgress(`  ${aliases.length} unclassified aliases.`);

  const now = new Date().toISOString();
  const updates: { alias: string; entity_type: 'creator' | 'fragment'; canonical_name: string; classified_at: string }[] = [];
  let creatorMatches = 0;
  let fragmentMatches = 0;

  for (const alias of aliases) {
    const creatorName = handleToName.get(alias);
    if (creatorName !== undefined) {
      updates.push({ alias, entity_type: 'creator', canonical_name: creatorName, classified_at: now });
      creatorMatches++;
    } else if (COMMON_WORD_FRAGMENTS.has(alias)) {
      updates.push({ alias, entity_type: 'fragment', canonical_name: alias, classified_at: now });
      fragmentMatches++;
    }
  }

  onProgress(`  ${creatorMatches} matched a creator handle, ${fragmentMatches} matched the common-word stoplist.`);
  onProgress(`Updating ${updates.length} rows (${UPDATE_BATCH_SIZE}/batch)...`);

  for (let i = 0; i < updates.length; i += UPDATE_BATCH_SIZE) {
    const batch = updates.slice(i, i + UPDATE_BATCH_SIZE);
    const { error } = await client.from('brand_aliases').upsert(batch, { onConflict: 'alias' });
    if (error) throw new Error(`Update failed at batch ${i / UPDATE_BATCH_SIZE}: ${error.message}`);
    onProgress(`  ${Math.min(i + UPDATE_BATCH_SIZE, updates.length)}/${updates.length}`, true);
  }
  const remainingForAi = aliases.length - updates.length;
  onProgress(`\nDone. ${remainingForAi} aliases remain unclassified for AI classification.`);

  return {
    unclassified: aliases.length,
    creatorMatches,
    fragmentMatches,
    rowsUpdated: updates.length,
    remainingForAi,
  };
}

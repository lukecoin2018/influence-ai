// Non-AI classification pass. For every unclassified alias (classified_at IS
// NULL): if it matches a social_profiles.handle, it's a creator being
// @mentioned/tagged, not a brand — classify as 'creator'. If it's a common
// word with no signal, classify as 'fragment'. Everything else is left
// unclassified for classify.mjs (the AI pass). Idempotent: only ever touches
// classified_at IS NULL rows, so reruns are a no-op for already-decided rows.
//
// Run: node scripts/brand-aliases/prepass.mjs
import { supabase, paginate } from './_supabase.mjs';
import { COMMON_WORD_FRAGMENTS } from './_stoplist.mjs';

const PAGE_SIZE = 1000;
const UPDATE_BATCH_SIZE = 500;

async function loadHandleToCreatorName() {
  const handleToCreatorId = new Map();
  await paginate(
    () => supabase.from('social_profiles').select('handle, creator_id'),
    PAGE_SIZE,
    (rows) => {
      for (const row of rows) {
        if (row.handle) handleToCreatorId.set(row.handle.trim().toLowerCase(), row.creator_id);
      }
    }
  );

  const creatorIdToName = new Map();
  await paginate(
    () => supabase.from('creators').select('id, display_name'),
    PAGE_SIZE,
    (rows) => {
      for (const row of rows) creatorIdToName.set(row.id, row.display_name);
    }
  );

  const handleToName = new Map();
  for (const [handle, creatorId] of handleToCreatorId.entries()) {
    handleToName.set(handle, creatorIdToName.get(creatorId) ?? handle);
  }
  return handleToName;
}

async function loadUnclassifiedAliases() {
  const aliases = [];
  await paginate(
    () => supabase.from('brand_aliases').select('alias').is('classified_at', null),
    PAGE_SIZE,
    (rows) => aliases.push(...rows.map((r) => r.alias))
  );
  return aliases;
}

async function main() {
  console.log('Loading social_profiles handles and creator display names...');
  const handleToName = await loadHandleToCreatorName();
  console.log(`  ${handleToName.size} handles loaded.`);

  console.log('Loading unclassified aliases...');
  const aliases = await loadUnclassifiedAliases();
  console.log(`  ${aliases.length} unclassified aliases.`);

  const now = new Date().toISOString();
  const updates = [];
  let creatorMatches = 0;
  let fragmentMatches = 0;

  for (const alias of aliases) {
    if (handleToName.has(alias)) {
      updates.push({ alias, entity_type: 'creator', canonical_name: handleToName.get(alias), classified_at: now });
      creatorMatches++;
    } else if (COMMON_WORD_FRAGMENTS.has(alias)) {
      updates.push({ alias, entity_type: 'fragment', canonical_name: alias, classified_at: now });
      fragmentMatches++;
    }
  }

  console.log(`  ${creatorMatches} matched a creator handle, ${fragmentMatches} matched the common-word stoplist.`);
  console.log(`Updating ${updates.length} rows (${UPDATE_BATCH_SIZE}/batch)...`);

  for (let i = 0; i < updates.length; i += UPDATE_BATCH_SIZE) {
    const batch = updates.slice(i, i + UPDATE_BATCH_SIZE);
    const { error } = await supabase.from('brand_aliases').upsert(batch, { onConflict: 'alias' });
    if (error) throw new Error(`Update failed at batch ${i / UPDATE_BATCH_SIZE}: ${error.message}`);
    process.stdout.write(`\r  ${Math.min(i + UPDATE_BATCH_SIZE, updates.length)}/${updates.length}`);
  }
  console.log(`\nDone. ${aliases.length - updates.length} aliases remain unclassified for AI classification.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

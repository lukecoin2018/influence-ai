// Scans creator_posts.detected_brands, extracts every distinct alias string,
// and upserts it into brand_aliases with a fresh creators_count — the
// distinct-creator count that gates AI-classification eligibility (>=2) and
// drives the admin Brand Index's default sort.
//
// Non-destructive: only ever writes {alias, creators_count} on conflict, so a
// rerun after classify.mjs has run never disturbs canonical_name/entity_type/
// category/region/verified/classified_at on already-classified rows.
//
// Run: node scripts/brand-aliases/seed.mjs
import { supabase } from './_supabase.mjs';
import { aggregateDetectedBrands } from './_aggregate.mjs';

const UPSERT_BATCH_SIZE = 500;

async function main() {
  console.log('Scanning creator_posts.detected_brands...');
  const stats = await aggregateDetectedBrands();
  console.log(`  ${stats.size} distinct aliases found.`);

  const rows = [...stats.entries()].map(([alias, entry]) => ({
    alias,
    creators_count: entry.creatorIds.size,
  }));

  console.log(`Upserting ${rows.length} aliases (creators_count only, ${UPSERT_BATCH_SIZE}/batch)...`);
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
    const { error } = await supabase.from('brand_aliases').upsert(batch, { onConflict: 'alias' });
    if (error) throw new Error(`Upsert failed at batch ${i / UPSERT_BATCH_SIZE}: ${error.message}`);
    process.stdout.write(`\r  ${Math.min(i + UPSERT_BATCH_SIZE, rows.length)}/${rows.length}`);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

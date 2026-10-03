import type { PipelineClient, PipelineOptions } from './types';
import { noopProgress } from './types';
import { aggregateDetectedBrands } from './aggregate';

/**
 * Step 1 of the brand-aliases pipeline. Scans creator_posts.detected_brands,
 * extracts every distinct alias string, and upserts it into brand_aliases with
 * a fresh creators_count — the distinct-creator count that gates
 * AI-classification eligibility (>=2) and drives the admin Brand Index's
 * default sort.
 *
 * Non-destructive: only ever writes {alias, creators_count} on conflict, so a
 * rerun after classify has run never disturbs canonical_name/entity_type/
 * category/region/verified/classified_at on already-classified rows.
 *
 * Logic moved unchanged from scripts/brand-aliases/seed.mjs. New here:
 * `newAliases`, measured as the brand_aliases row count after minus before,
 * because a PostgREST upsert cannot say which rows it inserted.
 */
const UPSERT_BATCH_SIZE = 500;

export type SeedResult = {
  /** Distinct alias strings found across all creator_posts. */
  aliasesFound: number;
  /** Rows sent through the upsert (equals aliasesFound; every alias is written). */
  rowsUpserted: number;
  /** brand_aliases row count after the run minus before it. */
  newAliases: number;
};

async function countBrandAliases(client: PipelineClient): Promise<number> {
  const { count, error } = await client.from('brand_aliases').select('*', { count: 'exact', head: true });
  if (error) throw new Error(`Counting brand_aliases failed: ${error.message}`);
  return count ?? 0;
}

export async function runSeed(client: PipelineClient, options: PipelineOptions = {}): Promise<SeedResult> {
  const onProgress = options.onProgress ?? noopProgress;

  const before = await countBrandAliases(client);

  onProgress('Scanning creator_posts.detected_brands...');
  const stats = await aggregateDetectedBrands(client);
  onProgress(`  ${stats.size} distinct aliases found.`);

  const rows = [...stats.entries()].map(([alias, entry]) => ({
    alias,
    creators_count: entry.creatorIds.size,
  }));

  onProgress(`Upserting ${rows.length} aliases (creators_count only, ${UPSERT_BATCH_SIZE}/batch)...`);
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
    const { error } = await client.from('brand_aliases').upsert(batch, { onConflict: 'alias' });
    if (error) throw new Error(`Upsert failed at batch ${i / UPSERT_BATCH_SIZE}: ${error.message}`);
    onProgress(`  ${Math.min(i + UPSERT_BATCH_SIZE, rows.length)}/${rows.length}`, true);
  }
  onProgress('\nDone.');

  const after = await countBrandAliases(client);

  return { aliasesFound: stats.size, rowsUpserted: rows.length, newAliases: after - before };
}

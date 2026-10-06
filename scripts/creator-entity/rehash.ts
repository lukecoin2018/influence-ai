// CLI wrapper for lib/creator-entity/rehash.ts — rewrites
// creator_entity.input_hash to the current hashInputs() scheme for rows whose
// verdict still stands, without calling the model. Needed once after
// follower_count left the hash (2026-10-06), and again after any future change
// to what hashInputs() covers.
//
// Run it BEFORE the next `npm run creator-entity:classify`: until it has run,
// every stored hash reads as stale and a classify run would re-classify every
// creator.
//
// Run: npm run creator-entity:rehash -- [--write]
//   (no flags)  DRY RUN: load, compare and print the plan; write nothing.
//   --write     rewrite input_hash on the rows the plan marks `rewrite`.
import { supabase } from './_supabase';
import { printProgress, runCli } from '../_shared/cli';
import { runCreatorEntityRehash } from '../../lib/creator-entity/rehash';

const write = process.argv.includes('--write');
const fmt = (n: number) => n.toLocaleString('en-US');

runCli(async () => {
  const result = await runCreatorEntityRehash(supabase, { write, onProgress: printProgress });
  const { counts, writeResult } = result;

  console.log(`\n── input_hash ──`);
  console.log(`  rewrite:  ${fmt(counts.rewrite)}  (inputs unchanged apart from follower_count — verdict stands)`);
  console.log(`  current:  ${fmt(counts.current)}  (already on the current scheme)`);
  console.log(`  changed:  ${fmt(counts.changed)}  (something the model reads changed — the next classify run re-classifies these)`);
  if (result.noRecord.length > 0) console.log(`  no creator: ${fmt(result.noRecord.length)}`);

  if (!write) {
    console.log(`\nDRY RUN — nothing written. Add --write to rewrite ${fmt(counts.rewrite)} hash(es). No model calls either way.`);
    return;
  }
  if (!writeResult) {
    console.log('\nNothing to rewrite.');
    return;
  }
  console.log(
    `\nRewrote ${fmt(writeResult.written)} hash(es)` +
      (writeResult.skipped > 0 ? `, ${fmt(writeResult.skipped)} skipped (changed since read)` : '') +
      (writeResult.failed > 0 ? `, ${fmt(writeResult.failed)} FAILED: ${[...new Set(writeResult.errors)].join(' | ')}` : '') +
      '.',
  );
  // Non-zero exit so a partial run can't pass for a clean one. Rerunning is
  // safe: rewritten rows read as `current`.
  if (writeResult.failed > 0) throw new Error(`${writeResult.failed} rewrite(s) failed`);
});

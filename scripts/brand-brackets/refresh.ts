// CLI wrapper for lib/pipeline/refresh.ts — recomputes brand_brackets (one row
// per verified canonical brand x platform). See that file for the maths and
// what gets written. Manual refresh (no cron).
//
// Run: npm run refresh:brand-brackets [-- --brand="Shein"] [--dry-run]
//   --brand=Name   print only that canonical brand's rows. Always a dry run:
//                  a partial recompute is never written to the table.
//   --dry-run      compute and print every row, write nothing.
import { supabase } from './_supabase';
import { printProgress, runCli } from '../_shared/cli';
import { runRefresh, type BracketRow } from '../../lib/pipeline/refresh';

function printRows(rows: BracketRow[]): void {
  for (const row of rows) {
    console.log(`${row.canonical_name} [${row.platform}]`);
    console.log(`  category: ${row.category ?? '(none)'}`);
    console.log(`  bracket (p25-p75 followers): ${Math.round(row.p25_followers).toLocaleString()} - ${Math.round(row.p75_followers).toLocaleString()}`);
    console.log(`  distinct_creators: ${row.distinct_creators}`);
    console.log(`  sponsored_posts: ${row.sponsored_posts}`);
    console.log(`  repeat_ratio: ${row.repeat_ratio.toFixed(2)}`);
    console.log(`  most_recent_post: ${row.most_recent_post ?? '(none)'}`);
    console.log(`  regions: ${row.regions.length > 0 ? row.regions.join(', ') : '(none)'}`);
    console.log('');
  }
}

function parseArgs(argv: string[]): { brand: string | null; dryRun: boolean } {
  let brand: string | null = null;
  let dryRun = false;
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--brand=')) brand = arg.slice('--brand='.length);
  }
  return { brand, dryRun };
}

runCli(async () => {
  const { brand, dryRun } = parseArgs(process.argv.slice(2));

  const result = await runRefresh(supabase, { brand, dryRun, onProgress: printProgress, onComputed: printRows });

  if (brand && result.rows.length === 0) {
    console.log(`No sponsored, verified-brand, follower-scored activity found for canonical_name="${brand}". Nothing to show.`);
    return;
  }

  if (result.dryRun) {
    console.log(`Dry run — ${result.rowsComputed} row(s) computed, nothing written to brand_brackets.`);
    return;
  }

  console.log(`Refreshed ${result.rowsWritten} brand x platform row(s).`);
  console.log(`Most recent post across all: ${result.mostRecentPost ?? '(none)'}`);
  console.log(`Oldest bracket source (least-fresh brand's own most-recent post): ${result.oldestBracketSource ?? '(none)'}`);
});

// CLI wrapper for lib/creator-entity/apply.ts — runs apply_creator_entity()
// (supabase/migrations/0027_creator_exclusion.sql) over every creator and
// reports which accounts the exclusion rule hides (creators.status =
// 'non_creator') or brings back. The rule lives in that SQL function.
//
// Run: npm run creator-entity:apply -- [flags]
//   (no flags)   DRY RUN: nothing is written. Prints counts by type and
//                platform, and the 50 highest-follower accounts that would be
//                hidden (follower counts from creator_entity.inputs).
//   --write      actually update creators.status and creator_entity.excluded.
//   --ids a,b,c  only these creator ids.
//
// After a --write that hides or unhides anything: run
// `npm run refresh:brand-brackets`, then purge the nginx cache on the VPS
// (CLAUDE.md, "nginx caches everything").
import { supabase } from './_supabase';
import { printProgress, runCli } from '../_shared/cli';
import { countByTypeAndPlatform, runCreatorEntityApply, topByFollowers, type AppliedChange } from '../../lib/creator-entity/apply';

function flagValue(name: string): string | null {
  const args = process.argv.slice(2);
  const eqArg = args.find((a) => a.startsWith(`${name}=`));
  if (eqArg) return eqArg.slice(name.length + 1);
  const flagIndex = args.indexOf(name);
  if (flagIndex !== -1 && args[flagIndex + 1] && !args[flagIndex + 1].startsWith('--')) return args[flagIndex + 1];
  return null;
}

const write = process.argv.includes('--write');
const ids = flagValue('--ids')?.split(',').map((s) => s.trim()).filter(Boolean) ?? null;

const fmt = (n: number) => n.toLocaleString('en-US');
const TOP = 50;

function printCounts(title: string, counts: Map<string, number>): void {
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  console.log(`\n── ${title}: ${fmt(total)} ──`);
  for (const [key, n] of counts) console.log(`  ${key.padEnd(28)}${fmt(n).padStart(7)}`);
}

function printChange(c: AppliedChange, i: number): void {
  const who = c.inputs?.handle ? `@${c.inputs.handle}` : c.creator_id;
  const followers = c.inputs?.follower_count != null ? fmt(c.inputs.follower_count) : '—';
  const verdict = c.reviewed ? `${c.effectiveType} (reviewed)` : `${c.effectiveType}/${c.confidence} flags=${c.flagCount}`;
  console.log(`  ${String(i + 1).padStart(2)}. ${who} [${c.inputs?.platform ?? '—'}, ${followers}] ${verdict}`);
  if (c.reason) console.log(`      ${c.reason}`);
}

runCli(async () => {
  const result = await runCreatorEntityApply(supabase, { write, ids, onProgress: printProgress });
  const verb = result.write ? 'Hidden' : 'Would hide';

  printCounts(`${verb} (active → non_creator)`, countByTypeAndPlatform(result.changes, 'non_creator'));
  printCounts(`${result.write ? 'Unhidden' : 'Would unhide'} (non_creator → active)`, countByTypeAndPlatform(result.changes, 'active'));

  const top = topByFollowers(result.changes, 'non_creator', TOP);
  if (top.length > 0) {
    console.log(`\n── ${verb}: the ${top.length} with the most followers ──`);
    top.forEach(printChange);
  }

  console.log(
    `\n${fmt(result.checked)} creator(s) checked, ${fmt(result.changes.length)} change(s)` +
      (result.write ? ' written.' : ' — DRY RUN, nothing written. Add --write to apply.') +
      (result.failedChunks > 0 ? ` ${result.failedChunks} chunk(s) FAILED: ${[...new Set(result.errors)].join(' | ')}` : ''),
  );
  if (result.write && result.changes.length > 0) {
    console.log('Next: npm run refresh:brand-brackets, then purge the nginx cache on the VPS.');
  }
  // Exit non-zero so a failed chunk can't pass for a clean run. Rerunning is
  // safe: the applied chunks report nothing left to change.
  if (result.failedChunks > 0) throw new Error(`${result.failedChunks} chunk(s) failed`);
});

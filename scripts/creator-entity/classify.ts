// CLI wrapper for lib/creator-entity/classify.ts — classifies every scraped
// creator account as creator / brand / media / venue / other and writes the
// verdict plus heuristic flags to creator_entity (migration 0026). See that
// file for the prompt, the resume rule and what gets written.
//
// Run: npm run creator-entity:classify -- [flags]
//   --dry-run          load, compute and call the model, but write nothing.
//                      Works before 0026 is applied (a missing table reads as
//                      empty). Prints every verdict.
//   --heuristics-only  no model calls: compute the flags, print the summary,
//                      and refresh signals/flag_count and the stored follower
//                      count on rows whose inputs are unchanged (never
//                      inserts). Add --dry-run to write nothing. Combine with
//                      --ids to see one creator's flags.
//
// Every run, not just --heuristics-only, refreshes the stored signals and
// follower count of creators whose model call it skips, so tuning a heuristic
// costs nothing and a re-scrape that only moves follower numbers costs no
// model call. Follower counts are not part of input_hash; after that changed
// (2026-10-06), `npm run creator-entity:rehash -- --write` has to run before
// the next classify run. See lib/creator-entity/rehash.ts.
//   --limit N          classify at most N creators (after unchanged ones are
//                      skipped).
//   --ids a,b,c        only these creator ids; also re-classifies them even
//                      when their inputs are unchanged.
//   --model ID         override the model (default claude-haiku-4-5-20251001).
//   --apply            after writing, run the exclusion rule
//                      (apply_creator_entity, migration 0027) over the creators
//                      this run wrote — verdicts and refreshed signals — and
//                      write the result to creators.status. For runs after a
//                      scrape. Ignored with --dry-run. Same report as
//                      `npm run creator-entity:apply` for those ids.
import { supabase, env } from './_supabase';
import { printProgress, runCli } from '../_shared/cli';
import { DEFAULT_MODEL, runCreatorEntityClassify, type VerdictReport } from '../../lib/creator-entity/classify';
import { countByTypeAndPlatform, runCreatorEntityApply } from '../../lib/creator-entity/apply';
import type { HeuristicsSummary } from '../../lib/creator-entity/heuristics';
import { SIGNAL_FLAGS, type CreatorEntitySignals } from '../../lib/creator-entity/types';

function flagValue(name: string): string | null {
  const args = process.argv.slice(2);
  const eqArg = args.find((a) => a.startsWith(`${name}=`));
  if (eqArg) return eqArg.slice(name.length + 1);
  const flagIndex = args.indexOf(name);
  if (flagIndex !== -1 && args[flagIndex + 1] && !args[flagIndex + 1].startsWith('--')) return args[flagIndex + 1];
  return null;
}

const dryRun = process.argv.includes('--dry-run');
const heuristicsOnly = process.argv.includes('--heuristics-only');
const apply = process.argv.includes('--apply');
const limitRaw = flagValue('--limit');
const limit = limitRaw != null ? Number(limitRaw) : null;
if (limit != null && (!Number.isInteger(limit) || limit < 0)) throw new Error(`--limit must be a non-negative integer, got ${limitRaw}`);
const ids = flagValue('--ids')?.split(',').map((s) => s.trim()).filter(Boolean) ?? null;
const model = flagValue('--model') ?? DEFAULT_MODEL;

const anthropicApiKey = env.ANTHROPIC_API_KEY ?? null;
if (!heuristicsOnly && !anthropicApiKey) throw new Error('Missing ANTHROPIC_API_KEY in .env.local');

const fmt = (n: number) => n.toLocaleString('en-US');

function trueFlags(signals: CreatorEntitySignals): string {
  const on = SIGNAL_FLAGS.filter((flag) => signals[flag]);
  return on.length > 0 ? on.join(', ') : '—';
}

function printSummary(h: HeuristicsSummary): void {
  console.log(`\n── Heuristics over ${fmt(h.records)} creators ──`);
  const platforms = ['instagram', 'tiktok', 'none'];
  console.log(`${'flag'.padEnd(26)}${platforms.map((p) => p.padStart(11)).join('')}${'total'.padStart(9)}`);
  for (const flag of SIGNAL_FLAGS) {
    const counts = h.byFlag[flag];
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`${flag.padEnd(26)}${platforms.map((p) => fmt(counts[p] ?? 0).padStart(11)).join('')}${fmt(total).padStart(9)}`);
  }
  const d = h.flagCountDistribution;
  console.log(`\nflag_count (non-creator flags, excluding ig_business and creator_category):`);
  console.log(`  0: ${fmt(d['0'])}   1: ${fmt(d['1'])}   2: ${fmt(d['2'])}   3+: ${fmt(d['3+'])}`);
  console.log(`  >= 1 flag: ${fmt(h.atLeastOneFlag)}   >= 2 flags: ${fmt(h.atLeastTwoFlags)}   any flag incl. ig_business: ${fmt(h.anyFlagIncludingIgBusiness)}`);
  console.log(`\ndomain_matches_name — ${h.domainMatchExamples.length} examples spread across follower counts:`);
  h.domainMatchExamples.forEach((e, i) =>
    console.log(`  ${String(i + 1).padStart(2)}. ${(e.followers != null ? fmt(e.followers) : '—').padStart(10)}  ${e.platform.padEnd(9)} ${e.match}`),
  );
  if (h.repeatedMatchedDomains.length > 0) {
    console.log(`\nMatched domains shared by more than one account:`);
    console.log(`  ${h.repeatedMatchedDomains.map(([d, n]) => `${d}: ${n}`).join(' | ')}`);
  }
  if (h.unlistedCategories.length > 0) {
    console.log(`\nInstagram categories in neither list (${h.unlistedCategories.length} shown):`);
    console.log(`  ${h.unlistedCategories.map(([c, n]) => `${c}: ${n}`).join(' | ')}`);
  }
}

function printVerdict(v: VerdictReport): void {
  const i = v.inputs;
  const who = i.handle ? `@${i.handle}` : `(no profile) ${i.display_name ?? v.creatorId}`;
  const followers = i.follower_count != null ? fmt(i.follower_count) : '—';
  console.log(`  ${who} [${i.platform ?? '—'}, ${followers}] flags(${v.flagCount}): ${trueFlags(v.signals)}`);
  console.log(`      → ${v.entityType}/${v.confidence}: ${v.reason}`);
}

runCli(async () => {
  const result = await runCreatorEntityClassify(supabase, {
    anthropicApiKey,
    model,
    dryRun,
    limit,
    ids,
    heuristicsOnly,
    onProgress: printProgress,
    onVerdict: dryRun || ids ? printVerdict : undefined,
  });

  printSummary(result.heuristics);
  console.log(
    `\nStored rows: ${fmt(result.unchanged)} with a current verdict; ${result.dryRun ? 'stale (not refreshed, dry run)' : 'refreshed'}: ` +
      `signals on ${fmt(result.signalsRefreshed)}, follower count on ${fmt(result.followersRefreshed)}` +
      (result.refreshFailed > 0 ? `, ${fmt(result.refreshFailed)} refresh(es) failed` : '') +
      (result.tableMissing ? ' (creator_entity not found)' : '') +
      '.',
  );

  // Per-creator flags for small runs (--ids, or a tiny database).
  if (result.computed.length <= 100) {
    console.log(`\n── Flags per creator ──`);
    for (const { record, signals } of result.computed) {
      const who = record.profile ? `@${record.profile.handle} [${record.profile.platform}]` : `(no profile) ${record.displayName ?? record.creatorId}`;
      const matched = Object.entries(signals.signals.matches)
        .map(([flag, text]) => `${flag}="${text}"`)
        .join('; ');
      console.log(`  ${who} flag_count=${signals.flagCount}: ${trueFlags(signals.signals)}${matched ? `\n      ${matched}` : ''}`);
    }
  }

  if (!heuristicsOnly) {
    const perRecordIn = result.classified > 0 ? result.usage.inputTokens / result.sent : 0;
    const perRecordOut = result.classified > 0 ? result.usage.outputTokens / result.sent : 0;
    console.log(`\n── Model run ──`);
    console.log(`  verdicts: ${JSON.stringify(result.byEntityType)}  confidence: ${JSON.stringify(result.byConfidence)}`);
    console.log(
      `  tokens: in ${fmt(result.usage.inputTokens)} / out ${fmt(result.usage.outputTokens)} over ${fmt(result.sent)} creators ` +
        `(per creator: in ${perRecordIn.toFixed(1)} / out ${perRecordOut.toFixed(1)})`,
    );
  }

  if (apply) {
    if (result.dryRun) {
      console.log('\n--apply ignored: this was a dry run, so nothing was written to apply.');
      return;
    }
    console.log(`\n── Exclusion rule over the ${fmt(result.writtenIds.length)} creator(s) this run wrote ──`);
    if (result.writtenIds.length === 0) return;
    const applied = await runCreatorEntityApply(supabase, { write: true, ids: result.writtenIds, onProgress: printProgress });
    for (const [title, to] of [['Hidden', 'non_creator'], ['Unhidden', 'active']] as const) {
      const counts = countByTypeAndPlatform(applied.changes, to);
      const total = [...counts.values()].reduce((a, b) => a + b, 0);
      console.log(`  ${title}: ${fmt(total)}${total > 0 ? ` (${[...counts].map(([k, n]) => `${k} ${fmt(n)}`).join(', ')})` : ''}`);
    }
    if (applied.failedChunks > 0) throw new Error(`apply: ${applied.failedChunks} chunk(s) failed: ${[...new Set(applied.errors)].join(' | ')}`);
    if (applied.changes.length > 0) console.log('  Next: npm run refresh:brand-brackets, then purge the nginx cache on the VPS.');
  }
});

// CLI wrapper for lib/pipeline/classify.ts — AI batch classification for the
// aliases the pre-pass couldn't resolve. See that file for the prompt, the
// eligibility rule and what gets written.
//
// Run: npm run brand-aliases:classify -- [--limit N] [--min-count N] [--preview] [--test-sample]
//   --limit N       process at most N batches (~50 aliases each) then stop —
//                   useful for reviewing raw model output before committing
//                   to a full run. Omit to process every eligible batch.
//   --min-count N   minimum creators_count to be eligible (default 2).
//   --preview       write the full verdict to classification_preview
//                   instead of the live columns, and don't set
//                   classified_at — for stress-testing the prompt on a test
//                   batch before a real run.
//   --test-sample   swap the normal eligible-alias query for a stratified
//                   ~80-row sample drawn from the same eligible pool.
//                   Requires --preview.
//
// The CLI always runs verbose, so the raw model output for every batch is
// printed as it always was; the one-line per-batch summary is new.
import { supabase, env } from './_supabase';
import { printProgress, runCli } from '../_shared/cli';
import { runClassify } from '../../lib/pipeline/classify';

const anthropicApiKey = env.ANTHROPIC_API_KEY;
if (!anthropicApiKey) throw new Error('Missing ANTHROPIC_API_KEY in .env.local');

function parseNumberFlag(name: string): number | null {
  const args = process.argv.slice(2);
  const eqArg = args.find((a) => a.startsWith(`${name}=`));
  if (eqArg) return Number(eqArg.split('=')[1]);
  const flagIndex = args.indexOf(name);
  if (flagIndex !== -1 && args[flagIndex + 1]) return Number(args[flagIndex + 1]);
  return null;
}

runCli(async () => {
  await runClassify(supabase, {
    anthropicApiKey,
    minCount: parseNumberFlag('--min-count') ?? 2,
    limit: parseNumberFlag('--limit'),
    preview: process.argv.includes('--preview'),
    testSample: process.argv.includes('--test-sample'),
    verbose: true,
    onProgress: printProgress,
  });
});

// CLI wrapper for lib/pipeline/prepass.ts — the non-AI classification pass
// (handle matches -> creator, stoplist matches -> fragment). See that file.
//
// Run: npm run brand-aliases:prepass
import { supabase } from './_supabase';
import { printProgress, runCli } from '../_shared/cli';
import { runPrepass } from '../../lib/pipeline/prepass';

runCli(async () => {
  await runPrepass(supabase, { onProgress: printProgress });
});

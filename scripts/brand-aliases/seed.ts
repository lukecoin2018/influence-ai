// CLI wrapper for lib/pipeline/seed.ts — scans creator_posts.detected_brands
// and upserts every distinct alias into brand_aliases with a fresh
// creators_count. See that file for what it reads and writes.
//
// Run: npm run brand-aliases:seed
import { supabase } from './_supabase';
import { printProgress, runCli } from '../_shared/cli';
import { runSeed } from '../../lib/pipeline/seed';

runCli(async () => {
  await runSeed(supabase, { onProgress: printProgress });
});

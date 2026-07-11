// Checkpoint runner for lib/reports/creator-brand-matches.ts's getCreatorBrandMatches().
// Run: npm run check-creator-matches -- <handleOrId>
//
// Uses its own service-role client rather than lib/supabase-admin.ts's
// createSupabaseAdminClient() — same reason as scripts/brand-brackets/_supabase.ts:
// that file's `import 'server-only'` throws immediately outside Next's bundler.
// getCreatorBrandMatches() itself takes a SupabaseClient as a parameter (same
// dependency-injection pattern as lib/reports/brand-activity.ts's getBrandActivity()),
// so this script's own client works with it without any conflict.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { getCreatorBrandMatches } from '../../lib/reports/creator-brand-matches';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env.local');

function loadEnv(): Record<string, string> {
  const text = fs.readFileSync(envPath, 'utf8');
  const env: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

async function main(): Promise<void> {
  const handleOrId = process.argv[2];
  if (!handleOrId) {
    console.error('Usage: npm run check-creator-matches -- <handleOrId>');
    process.exit(1);
  }

  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const result = await getCreatorBrandMatches(supabase, handleOrId);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Shared Supabase client for the brand-aliases scripts. Uses the service role
// key (these are ops scripts writing to a table with no RLS policies assumed
// yet) and reads .env.local directly since the project has no dotenv
// dependency and these scripts run outside Next's env loading.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env.local');

function loadEnv() {
  const text = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

export const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
export const env_ = env;

/**
 * Page through a query in chunks. `buildQuery` must return a FRESH query
 * builder each call (supabase-js builders are single-use) with `.range()`
 * applied by this function.
 */
export async function paginate(buildQuery, pageSize, onPage) {
  let offset = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    await onPage(data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
}

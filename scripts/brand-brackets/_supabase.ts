// Shared Supabase client for the brand-brackets refresh script.
//
// Deliberately does NOT import lib/supabase-admin.ts's createSupabaseAdminClient():
// that file has `import 'server-only'` at the top, which throws unconditionally
// unless resolved under Next's bundler-applied "react-server" condition — running
// it from a plain script (even via tsx) throws "This module cannot be imported
// from a Client Component module" immediately on import (verified). So this
// script builds its own service-role client, same credentials, same as
// scripts/brand-aliases/_supabase.mjs already does for the same reason (these
// ops scripts run outside any Next.js request, need the service role to bypass
// brand_aliases' admin-only RLS, and outside Next's env loading so .env.local is
// read directly).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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

const env = loadEnv();

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

export const supabase: SupabaseClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Pages through a query in chunks. `buildQuery` must return a FRESH query builder
 * each call (supabase-js builders are single-use) with `.range()` applied here.
 */
export async function paginate<T>(
  buildQuery: () => { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }> },
  pageSize: number,
  onPage: (rows: T[]) => void,
): Promise<void> {
  let offset = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    onPage(data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
}

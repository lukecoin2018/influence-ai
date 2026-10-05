// Shared Supabase client for the creator-entity CLI. Service role: it reads
// creators, social_profiles and brand_aliases across RLS and writes
// creator_entity, which has no insert policy for any session.
//
// Deliberately does NOT import lib/supabase-admin.ts's createSupabaseAdminClient():
// that file has `import 'server-only'` at the top, which throws unconditionally
// outside Next's bundler — see scripts/brand-brackets/_supabase.ts. Reads
// .env.local directly since the project has no dotenv dependency and this
// script runs outside Next's env loading.
//
// The logic lives in lib/creator-entity/* and takes this client as an
// argument; this file is the CLI's way of building one.
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
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

export const env = loadEnv();

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

export const supabase: SupabaseClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

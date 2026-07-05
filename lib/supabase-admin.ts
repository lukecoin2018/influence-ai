import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client — bypasses RLS entirely. Only import this from server
 * components / route handlers, never from a 'use client' file: the
 * `server-only` import above makes any accidental client-bundle import a
 * build error.
 *
 * Needed for the public /report/[slug] page: brand_aliases and
 * v_brand_partnerships are scoped to admins via RLS (see
 * supabase/migrations/0001_brand_aliases.sql), but report recipients are
 * anonymous cold-link visitors with no session. This client is used only to
 * run the narrow, hardcoded queries in lib/reports/brand-activity.ts — never
 * to expose the raw brand_aliases table to a response.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

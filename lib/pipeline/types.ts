import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared types for the post-scrape maintenance pipeline (lib/pipeline/*).
 *
 * Every step takes the Supabase client as an argument instead of building its
 * own. The CLI wrappers under scripts/ pass a service-role client built from
 * .env.local; an API route passes createSupabaseAdminClient(). Nothing in this
 * folder may import lib/supabase-admin.ts (it is `server-only` and throws
 * outside Next), lib/supabase-server.ts (reads cookies()), anything from
 * `next/*`, or read .env.local itself — lib/pipeline/no-next-imports.test.ts
 * enforces that.
 */
export type PipelineClient = SupabaseClient;

/**
 * Progress callback. `transient` marks an overwritable counter line
 * ("  500/23697") that the CLI prints with a carriage return and that a
 * route can skip; every other message is a complete line. Messages are the
 * exact strings the CLI printed before this refactor, leading newlines
 * included, so terminal output is byte-identical.
 */
export type ProgressFn = (message: string, transient?: boolean) => void;

export type PipelineOptions = {
  onProgress?: ProgressFn;
};

export function noopProgress(): void {}

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { requireRevalidateSecret } from '@/lib/auth/api-guards';
import { withNoStore } from '@/lib/http/no-store';
import { checkHomepageSnapshotHealth, type HealthSummary } from '@/lib/homepage-snapshot/health';

/**
 * POST /api/revalidate-home — `Authorization: Bearer <REVALIDATE_SECRET>`.
 *
 * Called by the database after every scheduled or requested homepage snapshot
 * refresh (ping_homepage_revalidate(), migration 0031, via pg_net), and by
 * hand with the same header. Two things, in order:
 *
 *   1. revalidatePath('/') and '/opengraph-image', so this process's next
 *      request regenerates both from the new snapshot. Only the process that
 *      receives the call is affected: the database calls influenceit.app (the
 *      VPS); Vercel's copy follows within its 300 s revalidate. nginx on the
 *      VPS keeps its own copy of `/` for up to the same 300 s.
 *   2. The alert check (lib/homepage-snapshot/health.ts): email ADMIN_EMAIL
 *      about refused or failed refreshes and a snapshot over 12 hours old.
 *
 * Calling it costs one row read on the next page render, so a leaked secret
 * buys a caller nothing but regenerations of a cheap page; it is still gated
 * so that nobody else can trigger the alert path.
 *
 * Always 200 once the secret checks out, with the alert summary in the body:
 * the caller is pg_net, which records the status and nothing more.
 */
export const POST = withNoStore(handlePOST);

async function handlePOST(req: NextRequest) {
  const gate = requireRevalidateSecret(req);
  if ('error' in gate) return gate.error;

  revalidatePath('/');
  revalidatePath('/opengraph-image');

  let health: HealthSummary | { error: string };
  try {
    health = await checkHomepageSnapshotHealth(createSupabaseAdminClient());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[snapshot-health] check threw: ${message}`);
    health = { error: message };
  }

  return NextResponse.json({ revalidated: ['/', '/opengraph-image'], health });
}

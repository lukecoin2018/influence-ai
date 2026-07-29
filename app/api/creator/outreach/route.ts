import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { withTimeout, TimeoutError } from '@/lib/withTimeout';
import { recordFunnelEvent } from '@/lib/funnel/events';

const READ_TIMEOUT_MS = 10_000;

/**
 * The creator's own outreach log for one brand: GET reads it, POST appends to it.
 *
 * creator_brand_outreach (supabase/migrations/0012) has RLS enabled with no
 * policies, so both halves bridge the caller's anon-key session to a
 * service-role client — the same pattern as app/api/creator/brand-matches.
 * The session is what proves identity; the service-role client only ever runs
 * the two narrow queries below, both scoped to the caller's own
 * creator_profile_id.
 */

/**
 * Resolves the caller to their creator_profiles row.
 *
 * creator_profiles.id IS the auth user id (it is that table's primary key), so
 * user.id is the profile id — no second lookup needed to get it. The select
 * still runs, because its real job is to prove a creator profile EXISTS for
 * this user: a brand account with a valid session must not be able to write
 * creator outreach rows.
 */
async function resolveCreatorProfile(): Promise<{ creatorProfileId: string } | { error: NextResponse }> {
  const session = await createSupabaseServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await session.from('creator_profiles').select('id').eq('id', user.id).maybeSingle();
  if (!profile?.id) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { creatorProfileId: profile.id };
}

/** Normalized the same way social_profiles.handle and the funnel writer normalize — an unnormalized handle groups as a separate destination. */
function normalizeHandle(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const normalized = handle.trim().replace(/^@/, '').toLowerCase();
  return normalized || null;
}

export async function GET(req: NextRequest) {
  const resolved = await resolveCreatorProfile();
  if ('error' in resolved) return resolved.error;

  const canonicalName = req.nextUrl.searchParams.get('brand');
  if (!canonicalName) return NextResponse.json({ error: 'Missing brand' }, { status: 400 });

  const admin = createSupabaseAdminClient();

  try {
    const { data, error } = await withTimeout(
      Promise.resolve(
        admin
          .from('creator_brand_outreach')
          .select('sequence_step, brand_handle, locale, marked_sent_at')
          .eq('creator_profile_id', resolved.creatorProfileId)
          .eq('canonical_name', canonicalName)
          .order('marked_sent_at', { ascending: false }),
      ),
      READ_TIMEOUT_MS,
    );

    // 0012 is applied by hand like every migration here, so "table not yet
    // created" is a real state. PostgREST reports it as an error rather than a
    // throw; degrade to an empty log so the page still renders and can still
    // generate messages — it just won't show any history.
    if (error) {
      console.warn(`[outreach] history read failed: ${error.message}`);
      return NextResponse.json({ sends: [] });
    }

    return NextResponse.json({
      sends: (data ?? []).map((row) => ({
        sequenceStep: row.sequence_step,
        brandHandle: row.brand_handle,
        locale: row.locale,
        markedSentAt: row.marked_sent_at,
      })),
    });
  } catch (err) {
    if (err instanceof TimeoutError) return NextResponse.json({ error: 'Timed out' }, { status: 504 });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const resolved = await resolveCreatorProfile();
  if ('error' in resolved) return resolved.error;

  let body: { brand?: unknown; handle?: unknown; step?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const canonicalName = typeof body.brand === 'string' ? body.brand.trim() : '';
  if (!canonicalName) return NextResponse.json({ error: 'Missing brand' }, { status: 400 });

  const step = Number(body.step);
  if (![1, 2, 3].includes(step)) return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

  // brand_handle is nullable: a brand with no verified alias can still be
  // marked as contacted, it just has no destination recorded.
  const brandHandle = normalizeHandle(typeof body.handle === 'string' ? body.handle : null);
  const locale = body.locale === 'es' ? 'es' : body.locale === 'en' ? 'en' : null;

  const admin = createSupabaseAdminClient();

  try {
    // INSERT, never upsert. A creator may legitimately send step 1 to two
    // different handles of the same brand, or re-send after a gap — every
    // marking is its own event, and collapsing them would destroy exactly the
    // history this table exists to keep. marked_sent_at and created_at are both
    // left to their column defaults so the timestamp is Postgres's, not this
    // host's (Vercel and the VPS do not share a clock).
    const { error } = await withTimeout(
      Promise.resolve(
        admin.from('creator_brand_outreach').insert({
          creator_profile_id: resolved.creatorProfileId,
          canonical_name: canonicalName,
          brand_handle: brandHandle,
          sequence_step: step,
          locale,
        }),
      ),
      READ_TIMEOUT_MS,
    );

    if (error) {
      console.warn(`[outreach] mark-sent write failed: ${error.message}`);
      return NextResponse.json({ error: 'Could not record' }, { status: 500 });
    }
  } catch (err) {
    if (err instanceof TimeoutError) return NextResponse.json({ error: 'Timed out' }, { status: 504 });
    throw err;
  }

  // After the write, and never in front of it: the funnel event is diagnostic,
  // the row is the product. recordFunnelEvent never throws and never blocks.
  recordFunnelEvent({
    eventType: 'message_marked_sent',
    creatorProfileId: resolved.creatorProfileId,
    locale,
    userAgent: req.headers.get('user-agent'),
    details: { canonical_name: canonicalName, brand_handle: brandHandle, sequence_step: step },
  });

  return NextResponse.json({ ok: true });
}

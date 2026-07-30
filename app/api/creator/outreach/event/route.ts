import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { recordFunnelEvent, type FunnelEventType } from '@/lib/funnel/events';
import { withNoStore } from '@/lib/http/no-store';

/**
 * The two outreach funnel events that originate in the browser.
 *
 * funnel_events is written server-side only — the writer uses next/server's
 * after(), and the table is service-role only precisely so a funnel cannot be
 * forged by anyone with the anon key. A client-side surface therefore needs an
 * endpoint, and this is it.
 *
 * The third outreach event, message_marked_sent, is NOT here: it is recorded by
 * the POST in ../route.ts, alongside the row it describes, so the event and the
 * record can never disagree about whether a marking happened.
 */

/**
 * Whitelist, not a passthrough. Without it this endpoint would let any
 * logged-in user write arbitrary event_types — including claim_completed and
 * verified — straight into the funnel these numbers are read from.
 */
const ALLOWED: readonly FunnelEventType[] = ['outreach_opened', 'message_copied'];

function isAllowed(value: unknown): value is FunnelEventType {
  return typeof value === 'string' && (ALLOWED as readonly string[]).includes(value);
}

export const POST = withNoStore(handlePOST);

async function handlePOST(req: NextRequest) {
  const session = await createSupabaseServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { event?: unknown; brand?: unknown; handle?: unknown; step?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!isAllowed(body.event)) return NextResponse.json({ error: 'Unknown event' }, { status: 400 });

  const step = Number(body.step);

  recordFunnelEvent({
    eventType: body.event,
    // user.id IS creator_profiles.id (that table's primary key). No profile
    // lookup here: this endpoint writes nothing but a diagnostic row, and
    // paying for a round trip to enrich one would put a query in front of a
    // fire-and-forget event, which is the thing instrumentation must never do.
    creatorProfileId: user.id,
    locale: body.locale === 'es' ? 'es' : body.locale === 'en' ? 'en' : null,
    userAgent: req.headers.get('user-agent'),
    details: {
      canonical_name: typeof body.brand === 'string' ? body.brand : null,
      brand_handle: typeof body.handle === 'string' ? body.handle : null,
      sequence_step: [1, 2, 3].includes(step) ? step : null,
    },
  });

  // 202: the write is scheduled, not done. The caller is a fire-and-forget
  // beacon and does not read this.
  return NextResponse.json({ ok: true }, { status: 202 });
}

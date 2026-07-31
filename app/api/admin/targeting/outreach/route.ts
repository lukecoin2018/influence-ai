import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { withNoStore } from '@/lib/http/no-store';

// Writes the manual "DMed" flag for the admin creator-targeting panel
// (app/admin/targeting). creator_outreach has RLS enabled with no policies
// (see supabase/migrations/0008_creator_outreach.sql) — only this
// service-role-backed, admin-auth-gated route can write it.
export const POST = withNoStore(handlePOST);

async function handlePOST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { creatorId, status, notes, variant, sentMatchCount } = body as {
      creatorId?: string;
      status?: string;
      notes?: string;
      variant?: string;
      sentMatchCount?: number;
    };
    if (!creatorId || typeof creatorId !== 'string') {
      return NextResponse.json({ error: 'Missing creatorId' }, { status: 400 });
    }
    if (status !== 'not_contacted' && status !== 'dmed') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (variant !== undefined && variant !== 'A' && variant !== 'B') {
      return NextResponse.json({ error: 'Invalid variant' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const payload: Record<string, unknown> = {
      creator_id: creatorId,
      status,
      dmed_at: status === 'dmed' ? new Date().toISOString() : null,
      dmed_by: status === 'dmed' ? user.id : null,
      updated_at: new Date().toISOString(),
    };
    // Omit notes entirely when not provided, so toggling status alone never
    // clobbers a previously-saved note on conflict-update.
    if (typeof notes === 'string') payload.notes = notes;

    // Which DM variant was pasted, and the match count that was in it. Both
    // are written ONCE, at the moment the creator is marked DMed — they record
    // what was sent, so they must not be refreshed later from the live row:
    // totalMatchCount moves every time brand_brackets is rebuilt, and an A/B
    // read against a count that has since changed is not a measurement.
    //
    // Same conditional-omit rule as notes above, for a second reason: these
    // columns arrive with migration 0014, which is applied by hand and out of
    // band. Sending a column PostgREST cannot find fails the whole upsert, so
    // an "Undo" (which sends no variant) keeps working either side of it.
    if (variant !== undefined) payload.variant = variant;
    if (typeof sentMatchCount === 'number' && Number.isFinite(sentMatchCount)) {
      payload.sent_match_count = sentMatchCount;
    }

    const { error } = await admin.from('creator_outreach').upsert(payload);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to update creator_outreach:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update' }, { status: 500 });
  }
}

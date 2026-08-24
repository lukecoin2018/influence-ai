import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkAndChargeAccess, FREE_ALLOWANCES } from '@/lib/tokens';
import { withNoStore } from '@/lib/http/no-store';
import { requireApprovedBrand } from '@/lib/auth/api-guards';

// Session-gated in a BILLING way: the token gate below charges per directory
// page, so a cached response could hand out paid pages without charging, or pin
// a paywall in front of an account that has paid. See lib/http/no-store.ts.
export const GET = withNoStore(handleGET);

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);

  // ── Authorization ─────────────────────────────────────────────────────────
  // This runs before any query work. The response body is the whole directory
  // row from v_creator_summary — contact_email, detected_brands, the AI summary
  // — so a caller reaching the query below walks the entire index by
  // pagination. Clamping `limit` does not close that.
  //
  // A session alone used to be enough, and it was not enough. The token gate
  // below only ever ran `if (brandProfile)`, so an authenticated account with
  // no brand_profiles row read the whole directory with tokenInfo null:
  // unmetered and unapproved. Failed brand signups produce exactly that
  // account, in quantity. Entitlement is now checked explicitly, and the
  // billing branch below is billing again rather than a de facto gate.
  //
  // Failing CLOSED is the point, and requireApprovedBrand() keeps the 503-on-
  // auth-unreachable behaviour this route already had.
  const gate = await requireApprovedBrand();
  if ('error' in gate) return gate.error;

  const serverSupabase = await createSupabaseServerClient();

  // ── Token gate ────────────────────────────────────────────────────────────
  // Billing only, and now unambiguously so: the caller is already known to be
  // an approved brand, so a missing row here is a data inconsistency rather
  // than an access decision. The `if` is kept because token_balance and the
  // usage counters are nullable and this route must tolerate that.
  let tokenInfo = null;

  const { data: brandProfile } = await serverSupabase
    .from('brand_profiles')
    .select('id, token_balance, directory_pages_used, profile_views_used')
    .eq('id', gate.userId)
    .maybeSingle();

  if (brandProfile) {
    const paginate = searchParams.get('paginate') === 'true';

    if (paginate) {
      // Paginating — charge free allowance or tokens
      const access = await checkAndChargeAccess(gate.userId, 'directory_pages');

      if (!access.allowed) {
        return NextResponse.json({
          locked: true,
          reason: 'tokens',
          balance: access.balance,
          needed: 5,
        }, { status: 402 });
      }

      tokenInfo = { ...access, profile_views_used: brandProfile.profile_views_used ?? 0 };
    } else {
      // Initial load / filter change — read current state, don't charge
      const used = brandProfile.directory_pages_used ?? 0;
      const limit = FREE_ALLOWANCES.directory_pages;
      tokenInfo = {
        withinFree: used < limit,
        used,
        limit,
        balance: brandProfile.token_balance ?? 0,
        allowed: true,
        profile_views_used: brandProfile.profile_views_used ?? 0,
      };
    }
  }

  // ── Query params ──────────────────────────────────────────────────────────
  const search = searchParams.get('search') ?? '';
  const minFollowers = searchParams.get('minFollowers');
  const maxFollowers = searchParams.get('maxFollowers');
  const minEngagement = searchParams.get('minEngagement');
  const category = searchParams.get('category');
  const platform = searchParams.get('platform');
  const verified = searchParams.get('verified');
  const sortBy = searchParams.get('sortBy') ?? 'total_followers';
  const sortDir = searchParams.get('sortDir') ?? 'desc';
  // parseInt alone returns NaN for '?limit=abc', which reached .range(NaN, NaN).
  // Number.isFinite rejects NaN and Infinity; the clamp keeps a caller from
  // asking for the whole table in one request. The UI asks for 24.
  const clampInt = (raw: string | null, fallback: number, min: number, max: number) => {
    const parsed = parseInt(raw ?? '', 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(Math.floor(parsed), min), max);
  };

  // page is bounded too, so `offset` below cannot overflow into a value that
  // loses integer precision. 100k pages is far past the ~6k rows that exist.
  const page = clampInt(searchParams.get('page'), 1, 1, 100_000);
  const limit = clampInt(searchParams.get('limit'), 24, 1, 50);
  const offset = (page - 1) * limit;
  const language = searchParams.get('language') || '';
  const country = searchParams.get('country') || '';
  const hasEmail = searchParams.get('hasEmail') === 'true';

  // ── Build query ───────────────────────────────────────────────────────────
  let query = supabase.from('v_creator_summary').select('*', { count: 'exact' });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,instagram_handle.ilike.%${search}%,tiktok_handle.ilike.%${search}%`
    );
  }

  if (minFollowers) query = query.gte('total_followers', parseInt(minFollowers, 10));
  if (maxFollowers) query = query.lte('total_followers', parseInt(maxFollowers, 10));
  if (minEngagement) {
    query = query.or(
      `instagram_engagement.gte.${parseFloat(minEngagement)},tiktok_engagement.gte.${parseFloat(minEngagement)}`
    );
  }

  if (platform === 'instagram') query = query.not('instagram_handle', 'is', null);
  if (platform === 'tiktok') query = query.not('tiktok_handle', 'is', null);
  if (platform === 'both') {
    query = query.not('instagram_handle', 'is', null).not('tiktok_handle', 'is', null);
  }

  if (verified === 'true') {
    query = query.or('instagram_verified.eq.true,tiktok_verified.eq.true');
  }

  if (language) query = query.eq('primary_language', language);
  if (country) query = query.eq('country', country);
  if (hasEmail) query = query.not('contact_email', 'is', null);

  if (category) {
    const { data: profileMatches } = await supabase
      .from('social_profiles')
      .select('creator_id')
      .eq('platform_data->>category_name', category);
    const ids = (profileMatches ?? []).map((p) => p.creator_id);
    if (ids.length === 0) {
      return NextResponse.json({ creators: [], total: 0, page, limit, totalPages: 0 });
    }
    query = query.in('creator_id', ids);
  }

  const validSortFields: Record<string, string> = {
    total_followers: 'total_followers',
    instagram_followers: 'instagram_followers',
    tiktok_followers: 'tiktok_followers',
    instagram_engagement: 'instagram_engagement',
    tiktok_engagement: 'tiktok_engagement',
    follower_count: 'total_followers',
  };
  const safeSortBy = validSortFields[sortBy] ?? 'total_followers';

  query = query
    .order(safeSortBy, { ascending: sortDir === 'asc', nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count ?? 0;

  return NextResponse.json({
    creators: data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    tokenInfo,
  });
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkAndChargeAccess, FREE_ALLOWANCES } from '@/lib/tokens';
import { withNoStore } from '@/lib/http/no-store';

// Session-gated in a BILLING way: the token gate below charges per directory
// page, so a cached response could hand out paid pages without charging, or pin
// a paywall in front of an account that has paid. See lib/http/no-store.ts.
export const GET = withNoStore(handleGET);

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);

  // ── Token gate ────────────────────────────────────────────────────────────
  let tokenInfo = null;

  try {
    const serverSupabase = await createSupabaseServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (user) {
      const { data: brandProfile } = await serverSupabase
        .from('brand_profiles')
        .select('id, token_balance, directory_pages_used, profile_views_used')
        .eq('id', user.id)
        .maybeSingle();

      if (brandProfile) {
        const paginate = searchParams.get('paginate') === 'true';

        if (paginate) {
          // Paginating — charge free allowance or tokens
          const access = await checkAndChargeAccess(user.id, 'directory_pages');

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
    }
  } catch {
    // If auth check fails, fall through and serve results publicly
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
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '24', 10);
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

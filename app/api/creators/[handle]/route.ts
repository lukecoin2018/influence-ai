import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hasValidatedSession } from '@/lib/supabase-server';
import { withNoStore } from '@/lib/http/no-store';
import {
  SOCIAL_PROFILE_PUBLIC_COLUMNS,
  SOCIAL_PROFILE_TEASER_COLUMNS,
  CREATOR_TEASER_COLUMNS,
} from '@/lib/types';
import type { SocialProfile } from '@/lib/types';

/**
 * The API twin of /creators/[handle], and gated on the same projections from
 * lib/types.ts so the two cannot drift. Gating the page while leaving this open
 * would change nothing — a scraper reads the JSON, not the HTML.
 *
 * This route used to return the full creator record to anyone: the scraped bio
 * (free text carrying contact addresses) plus discovered_via_hashtags,
 * discovery_count, first_discovered_at and notes, none of which any surface
 * displays.
 *
 * NOTE: this route was previously one of the deliberately-cacheable public GETs
 * — its body depended only on the URL. It no longer does, so withNoStore() is
 * required, not optional. Webuzo's nginx keys on URI alone with no cookie and
 * stores any 200 for 60m at proxy_cache_min_uses 1; without the header, one
 * authenticated response would be replayed to every anonymous caller for an
 * hour. This is the first guarded route with a dynamic path segment; see
 * lib/http/no-store.ts for why that works.
 */
async function handleGET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;

  // Validates the token rather than trusting the cookie, and skips the auth
  // round trip when no auth cookie is present. See lib/supabase-server.ts.
  const isLoggedIn = await hasValidatedSession();

  // Reads stay on the anon client so RLS and the statement timeout are
  // unchanged; the server client is used only to establish the session.
  const { data: profile, error: profileError } = await supabase
    .from('social_profiles')
    .select('creator_id')
    .eq('handle', handle)
    .limit(1)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  const { data: creator, error: creatorError } = await supabase
    .from('creators')
    .select(isLoggedIn ? '*' : CREATOR_TEASER_COLUMNS)
    .eq('id', profile.creator_id)
    .single();

  if (creatorError || !creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // Named columns, not '*' — see SOCIAL_PROFILE_PUBLIC_COLUMNS. This is a
  // public unauthenticated endpoint running as the anon role: '*' was returning
  // every social_profiles column, detected_email included, in the JSON body.
  const { data: profiles } = await supabase
    .from('social_profiles')
    .select(isLoggedIn ? SOCIAL_PROFILE_PUBLIC_COLUMNS : SOCIAL_PROFILE_TEASER_COLUMNS)
    .eq('creator_id', profile.creator_id)
    .returns<SocialProfile[]>();

  // Cast because the select string is chosen at runtime, so supabase-js cannot
  // parse a row type out of it — the same reason the profiles read above needs
  // .returns<SocialProfile[]>().
  const creatorRow = creator as unknown as Record<string, unknown>;

  return NextResponse.json({ creator: { ...creatorRow, social_profiles: profiles ?? [] } });
}

export const GET = withNoStore(handleGET);

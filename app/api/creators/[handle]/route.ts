import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SOCIAL_PROFILE_PUBLIC_COLUMNS } from '@/lib/types';
import type { SocialProfile } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;

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
    .select('*')
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
    .select(SOCIAL_PROFILE_PUBLIC_COLUMNS)
    .eq('creator_id', profile.creator_id)
    .returns<SocialProfile[]>();

  return NextResponse.json({ creator: { ...creator, social_profiles: profiles ?? [] } });
}
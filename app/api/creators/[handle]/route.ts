import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

  const { data: profiles } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('creator_id', profile.creator_id);

  return NextResponse.json({ creator: { ...creator, social_profiles: profiles ?? [] } });
}
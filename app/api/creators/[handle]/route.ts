import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;

  const { data, error } = await supabase
    .from('creators')
    .select('*')
    .eq('instagram_handle', handle)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  return NextResponse.json({ creator: data });
}
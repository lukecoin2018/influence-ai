import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handlesParam = searchParams.get('handles');

  if (!handlesParam) {
    return NextResponse.json({ error: 'handles param required' }, { status: 400 });
  }

  const handles = handlesParam.split(',').map((h) => h.trim()).filter(Boolean);

  if (handles.length < 2 || handles.length > 4) {
    return NextResponse.json(
      { error: 'Provide between 2 and 4 handles' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('creators')
    .select('*')
    .in('instagram_handle', handles);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ creators: data });
}
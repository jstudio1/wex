import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = createServiceClient();
  const { data, error } = await sb.from('categories').select('id, name, slug').eq('is_published', true).order('name');
  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });
  return NextResponse.json(
    { data },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
      },
    }
  );
}




import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('app_premium_categories')
    .select('*')
    .eq('is_published', true)
    .order('display_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching app premium categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }

  return NextResponse.json(data || [], {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

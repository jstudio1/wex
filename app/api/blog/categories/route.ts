import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { cache } from 'react';

export const revalidate = 60;

export const GET = cache(async (req: NextRequest) => {
  try {
    const sb = createServiceClient();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active_only') === 'true';

    let query = sb.from('blog_categories').select('*').order('name', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[blog][categories] fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    return NextResponse.json({ categories: data || [] });
  } catch (error: any) {
    console.error('[blog][categories] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});


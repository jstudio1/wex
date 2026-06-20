import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { cache } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export const GET = cache(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('category');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'published';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const sb = createServiceClient();

    let query = sb
      .from('blog_posts')
      .select(
        `
        id,
        title,
        slug,
        description,
        cover_image_url,
        category_id,
        category:blog_categories(id,name,slug),
        status,
        view_count,
        published_at,
        created_at,
        updated_at
      `,
      )
      .eq('status', status)
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (categorySlug) {
      query = query.eq('blog_categories.slug', categorySlug);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[blog][posts] fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    return NextResponse.json({
      posts: data || [],
      total: count || 0,
    });
  } catch (error: any) {
    console.error('[blog][posts] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});


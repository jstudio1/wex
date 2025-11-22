import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { cache } from 'react';

export const revalidate = 60;

export const GET = cache(async () => {
  try {
    const sb = createServiceClient();

    const { data, error } = await sb
      .from('blog_posts')
      .select(
        `
        id,
        title,
        slug,
        description,
        cover_image_url,
        category:blog_categories(id,name,slug),
        published_at,
        created_at,
        view_count
      `,
      )
      .eq('status', 'published')
      .eq('post_type', 'news')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(2);

    if (error) {
      console.error('[blog][latest] fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch latest posts' }, { status: 500 });
    }

    return NextResponse.json({
      posts: data || [],
    });
  } catch (error: any) {
    console.error('[blog][latest] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});


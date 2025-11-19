import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { cache } from 'react';

export const revalidate = 60;

export const GET = cache(async (req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  try {
    const { slug } = await params;
    const sb = createServiceClient();

    const { data: post, error } = await sb
      .from('blog_posts')
      .select(
        `
        *,
        category:blog_categories(id,name,slug,description)
      `,
      )
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    await sb
      .from('blog_posts')
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq('id', post.id);

    const { data: relatedPosts } = await sb
      .from('blog_posts')
      .select('id,title,slug,cover_image_url,published_at')
      .eq('status', 'published')
      .neq('id', post.id)
      .eq('category_id', post.category_id)
      .order('published_at', { ascending: false })
      .limit(3);

    return NextResponse.json({
      post: { ...post, view_count: (post.view_count || 0) + 1 },
      relatedPosts: relatedPosts || [],
    });
  } catch (error: any) {
    console.error('[blog][post] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});


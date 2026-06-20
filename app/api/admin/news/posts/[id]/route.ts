import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { slugify } from '@/lib/blog';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('blog_posts')
      .select('*, category:blog_categories(id,name,slug)')
      .eq('id', id)
      .eq('post_type', 'news')
      .single();

    if (error) {
      console.error('[admin][news][posts][id] fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch (error: any) {
    console.error('[admin][news][posts][id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, description, content, cover_image_url, category_id, status, published_at } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const slug = body.slug || slugify(title);
    const sb = createServiceClient();

    // Check if slug exists for another post
    const { data: existing } = await sb
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    const updateData: any = {
      title,
      slug,
      description: description || null,
      content,
      cover_image_url: cover_image_url || null,
      category_id: category_id || null,
      status: status || 'draft',
      updated_at: new Date().toISOString(),
    };

    if (published_at !== undefined) {
      updateData.published_at = published_at;
    } else if (status === 'published') {
      // Check if published_at is already set
      const { data: currentPost } = await sb
        .from('blog_posts')
        .select('published_at')
        .eq('id', id)
        .single();
      
      if (!currentPost?.published_at) {
        updateData.published_at = new Date().toISOString();
      }
    }

    const { data: post, error } = await sb
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .eq('post_type', 'news')
      .select()
      .single();

    if (error) {
      console.error('[admin][news][posts][id] update error:', error);
      return NextResponse.json({ error: 'Failed to update news' }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (error: any) {
    console.error('[admin][news][posts][id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const sb = createServiceClient();
    const { error } = await sb
      .from('blog_posts')
      .delete()
      .eq('id', id)
      .eq('post_type', 'news');

    if (error) {
      console.error('[admin][news][posts][id] delete error:', error);
      return NextResponse.json({ error: 'Failed to delete news' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[admin][news][posts][id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


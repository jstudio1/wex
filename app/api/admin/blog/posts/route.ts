import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { getAuthUser } from '@/lib/auth';
import { slugify } from '@/lib/blog';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const sb = createServiceClient();

    let query = sb
      .from('blog_posts')
      .select(
        `
        *,
        category:blog_categories(id,name,slug)
      `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[admin][blog][posts] fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    return NextResponse.json({
      posts: data || [],
      total: count || 0,
    });
  } catch (error: any) {
    console.error('[admin][blog][posts] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, content, cover_image_url, category_id, status } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const slug = body.slug || slugify(title);
    const sb = createServiceClient();

    const { data: existing } = await sb.from('blog_posts').select('id').eq('slug', slug).single();

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    const publishedAt = status === 'published' ? new Date().toISOString() : null;

    const { data: post, error } = await sb
      .from('blog_posts')
      .insert({
        title,
        slug,
        description: description || null,
        content,
        cover_image_url: cover_image_url || null,
        category_id: category_id || null,
        status: status || 'draft',
        author_id: admin.id,
        published_at: publishedAt,
      })
      .select()
      .single();

    if (error) {
      console.error('[admin][blog][posts] create error:', error);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    console.error('[admin][blog][posts] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


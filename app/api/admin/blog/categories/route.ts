import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { slugify } from '@/lib/blog';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sb = createServiceClient();

    const { data, error } = await sb
      .from('blog_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[admin][blog][categories] fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    return NextResponse.json({ categories: data || [] });
  } catch (error: any) {
    console.error('[admin][blog][categories] error:', error);
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
    const { name, description, is_active } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = body.slug || slugify(name);
    const sb = createServiceClient();

    const { data: existing } = await sb.from('blog_categories').select('id').eq('slug', slug).single();

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    const { data: category, error } = await sb
      .from('blog_categories')
      .insert({
        name,
        slug,
        description: description || null,
        is_active: is_active !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('[admin][blog][categories] create error:', error);
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    console.error('[admin][blog][categories] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


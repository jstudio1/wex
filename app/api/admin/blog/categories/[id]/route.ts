import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { slugify } from '@/lib/blog';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, slug, description, is_active } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const finalSlug = slug || slugify(name);
    const sb = createServiceClient();

    const { data: existing } = await sb
      .from('blog_categories')
      .select('id')
      .eq('slug', finalSlug)
      .neq('id', parseInt(id))
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    const { data: category, error } = await sb
      .from('blog_categories')
      .update({
        name,
        slug: finalSlug,
        description: description || null,
        is_active: is_active !== false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('[admin][blog][category] update error:', error);
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }

    return NextResponse.json({ category });
  } catch (error: any) {
    console.error('[admin][blog][category] error:', error);
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

    const { error } = await sb.from('blog_categories').delete().eq('id', parseInt(id));

    if (error) {
      console.error('[admin][blog][category] delete error:', error);
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[admin][blog][category] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


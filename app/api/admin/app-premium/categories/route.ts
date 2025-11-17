import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('app_premium_categories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching app premium categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id, display_name, filter_keywords, is_published, display_order, icon_url } = body;

  if (!id || typeof id !== 'number') {
    return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
  }

  const sb = createServiceClient();
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (display_name !== undefined) updateData.display_name = display_name;
  if (filter_keywords !== undefined) {
    // Ensure filter_keywords is an array
    if (Array.isArray(filter_keywords)) {
      updateData.filter_keywords = filter_keywords;
    } else {
      updateData.filter_keywords = [];
    }
  }
  if (is_published !== undefined) updateData.is_published = is_published;
  if (display_order !== undefined) updateData.display_order = display_order;
  if (icon_url !== undefined) updateData.icon_url = icon_url === '' || icon_url === null ? null : icon_url;

  const { data, error } = await sb
    .from('app_premium_categories')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating app premium category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { category, display_name, filter_keywords, is_published, display_order, icon_url } = body;

  if (!category || typeof category !== 'string') {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
  }

  const sb = createServiceClient();
  const insertData: any = {
    category: category.trim().toLowerCase(),
    display_name: display_name || category,
    filter_keywords: Array.isArray(filter_keywords) ? filter_keywords : [],
    is_published: is_published !== false,
    display_order: display_order || 0,
    icon_url: icon_url || null,
  };

  const { data, error } = await sb
    .from('app_premium_categories')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating app premium category:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
  }

  const sb = createServiceClient();
  const { error } = await sb
    .from('app_premium_categories')
    .delete()
    .eq('id', Number(id));

  if (error) {
    console.error('Error deleting app premium category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

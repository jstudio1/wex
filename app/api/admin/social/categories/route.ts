import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .substring(0, 100);
}

function categorySlug(name: string) {
  const slug = slugify(name);
  return slug || `category-${Date.now()}`;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('social_categories')
    .select('id, name, slug, is_published, display_order')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });

  const sb = createServiceClient();
  const { data: lastCategory } = await sb
    .from('social_categories')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseSlug = categorySlug(name);
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const { data: existing } = await sb
      .from('social_categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!existing) break;
    slug = `${baseSlug}-${suffix++}`;
  }

  const { data, error } = await sb
    .from('social_categories')
    .insert({
      name,
      slug,
      is_published: payload?.is_published !== false,
      display_order: Number(lastCategory?.display_order || 0) + 1,
    })
    .select('id, name, slug, is_published, display_order')
    .single();

  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });

  try { revalidatePath('/social'); } catch {}
  try { revalidatePath('/api/social/services'); } catch {}

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const payload = await req.json();
  const { id, name, is_published, display_order } = payload ?? {};
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof name === 'string') update.name = name;
  if (typeof is_published === 'boolean') update.is_published = is_published;
  if (typeof display_order === 'number' && Number.isFinite(display_order)) update.display_order = display_order;
  if (!Object.keys(update).length) return NextResponse.json({ error: 'empty_payload' }, { status: 400 });

  const sb = createServiceClient();
  const { error } = await sb
    .from('social_categories')
    .update(update)
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });

  try { revalidatePath('/social'); } catch {}
  try { revalidatePath('/api/social/services'); } catch {}

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const categories = Array.isArray(payload?.categories) ? payload.categories : [];
  if (!categories.length) return NextResponse.json({ error: 'empty_payload' }, { status: 400 });

  const updates = categories
    .map((category: { id?: unknown; display_order?: unknown }, index: number) => ({
      id: Number(category.id),
      display_order: Number.isFinite(Number(category.display_order)) ? Number(category.display_order) : index + 1,
    }))
    .filter((category: { id: number }) => Number.isInteger(category.id) && category.id > 0);

  if (!updates.length) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const sb = createServiceClient();

  for (const category of updates) {
    const { error } = await sb
      .from('social_categories')
      .update({ display_order: category.display_order })
      .eq('id', category.id);

    if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  }

  try { revalidatePath('/social'); } catch {}
  try { revalidatePath('/api/social/services'); } catch {}

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const sb = createServiceClient();

  const { error: detachError } = await sb
    .from('social_services')
    .update({ category_id: null })
    .eq('category_id', id);

  if (detachError) return NextResponse.json({ error: 'db_error', detail: detachError.message }, { status: 500 });

  const { error } = await sb
    .from('social_categories')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });

  try { revalidatePath('/social'); } catch {}
  try { revalidatePath('/api/social/services'); } catch {}

  return NextResponse.json({ ok: true });
}


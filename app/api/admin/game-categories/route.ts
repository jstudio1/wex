import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  image_url: z.string().url().optional().nullable(),
  is_published: z.boolean().optional()
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  image_url: z.string().url().optional().nullable(),
  is_published: z.boolean().optional()
});

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('game_categories')
      .select('*')
      .order('name');

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    // Invalidate cached game-categories immediately so UI updates
    try { revalidateTag('game-categories'); } catch {}
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error('Game categories GET error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validated = createCategorySchema.parse(body);

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('game_categories')
      .insert({
        name: validated.name,
        slug: validated.slug,
        image_url: validated.image_url || null,
        is_published: validated.is_published ?? true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'slug_already_exists', detail: 'Slug already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    // Invalidate cached game-categories immediately so UI updates
    try { revalidateTag('game-categories'); } catch {}
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('Game categories POST error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'id_required' }, { status: 400 });
    }

    const validated = updateCategorySchema.parse(updateData);

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('game_categories')
      .update({
        ...validated,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'slug_already_exists', detail: 'Slug already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('Game categories PUT error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id_required' }, { status: 400 });
    }

    const sb = createServiceClient();
    const { error } = await sb
      .from('game_categories')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    // Invalidate cached game-categories immediately so UI updates
    try { revalidateTag('game-categories'); } catch {}
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Game categories DELETE error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


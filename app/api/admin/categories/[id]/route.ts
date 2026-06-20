import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/i).optional(),
  is_published: z.boolean().optional(),
  show_on_homepage: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateCategorySchema.parse(body);

    const sb = createServiceClient();
    const updateData: any = {};
    if (parsed.name !== undefined) updateData.name = parsed.name.trim();
    if (parsed.slug !== undefined) updateData.slug = parsed.slug.trim().toLowerCase();
    if (parsed.is_published !== undefined) updateData.is_published = parsed.is_published;
    if (parsed.show_on_homepage !== undefined) updateData.show_on_homepage = parsed.show_on_homepage;

    const { data, error } = await sb
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'slug นี้มีอยู่แล้ว' }, { status: 409 });
      }
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;

  const sb = createServiceClient();
  const { error } = await sb.from('categories').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}


import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/i).optional(),
  is_published: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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

    const { data, error } = await sb
      .from('categories')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'slug นี้มีอยู่แล้ว' }, { status: 409 });
      }
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    try { revalidateTag('categories'); } catch {}
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { error } = await sb.from('categories').delete().eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  try { revalidateTag('categories'); } catch {}
  return NextResponse.json({ ok: true });
}


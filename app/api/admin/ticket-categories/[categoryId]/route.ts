import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

const paramsSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
});

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(200).optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function PUT(req: Request, context: { params: { categoryId: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { categoryId } = paramsSchema.parse(context.params);
    const body = await req.json();
    const payload = updateSchema.parse(body);
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('ticket_categories')
      .update({
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.description !== undefined ? { description: payload.description?.trim() || null } : {}),
        ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)
      .select('*')
      .single();
    if (error || !data) {
      console.error('[admin][ticket-categories][PUT] update error', error);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ category: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.flatten() }, { status: 400 });
    }
    console.error('[admin][ticket-categories][PUT] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: { categoryId: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { categoryId } = paramsSchema.parse(context.params);
    const sb = createServiceClient();
    const { error } = await sb.from('ticket_categories').delete().eq('id', categoryId);
    if (error) {
      console.error('[admin][ticket-categories][DELETE] error', error);
      return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.flatten() }, { status: 400 });
    }
    console.error('[admin][ticket-categories][DELETE] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



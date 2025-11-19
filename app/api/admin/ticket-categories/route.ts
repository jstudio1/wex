import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

const categorySchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(200).optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('ticket_categories')
      .select('*')
      .order('is_active', { ascending: false })
      .order('name', { ascending: true });
    if (error) {
      console.error('[admin][ticket-categories][GET] error', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }
    return NextResponse.json({ categories: data || [] });
  } catch (err) {
    console.error('[admin][ticket-categories][GET] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const payload = categorySchema.parse(body);
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('ticket_categories')
      .insert({
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        is_active: payload.is_active ?? true,
      })
      .select('*')
      .single();
    if (error || !data) {
      console.error('[admin][ticket-categories][POST] insert error', error);
      return NextResponse.json({ error: 'create_failed' }, { status: 500 });
    }
    return NextResponse.json({ category: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.flatten() }, { status: 400 });
    }
    console.error('[admin][ticket-categories][POST] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



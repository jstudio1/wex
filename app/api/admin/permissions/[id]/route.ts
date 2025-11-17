import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const numeric = (min: number, max?: number) =>
  z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed.length) return 0;
        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? trimmed : parsed;
      }
      return val;
    },
    max !== undefined ? z.number().min(min).max(max) : z.number().min(min)
  );

const updateSchema = z
  .object({
    name: z.string().min(1).max(150).optional(),
    description: z
      .preprocess((val) => (typeof val === 'string' ? val.trim() : val), z.string().max(500))
      .nullable()
      .optional(),
    discount_percent: numeric(0, 100).optional(),
    discount_amount: numeric(0).optional(),
    discount_cap_amount: numeric(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'empty_payload' });

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateSchema.parse(body);

    const sb = createServiceClient();

    const { data: existing, error: fetchError } = await sb
      .from('permissions')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: 'db_error', details: fetchError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const updateData: Record<string, any> = {};

    if (parsed.name !== undefined) updateData.name = parsed.name.trim();
    if (parsed.description !== undefined)
      updateData.description = parsed.description ? parsed.description.trim() : null;
    if (parsed.discount_percent !== undefined) updateData.discount_percent = parsed.discount_percent;
    if (parsed.discount_amount !== undefined) updateData.discount_amount = parsed.discount_amount;
    if (parsed.discount_cap_amount !== undefined)
      updateData.discount_cap_amount = parsed.discount_cap_amount;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'no_changes' }, { status: 400 });
    }

    const { data, error } = await sb
      .from('permissions')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'ชื่อสิทธิ์ซ้ำ' }, { status: 409 });
      }
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: err.issues }, { status: 400 });
    }
    if (err instanceof Error && err.message === 'empty_payload') {
      return NextResponse.json({ error: 'empty_payload' }, { status: 400 });
    }
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { error } = await sb.from('permissions').delete().eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}



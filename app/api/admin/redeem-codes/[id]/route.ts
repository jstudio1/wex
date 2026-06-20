import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const updateRedeemCodeSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i).optional(),
  points: z.number().int().positive().optional(),
  usage_limit: z.number().int().positive().nullable().optional(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('redeem_codes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateRedeemCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', details: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    const sb = createServiceClient();

    // ตรวจสอบว่าโค้ดมีอยู่จริง
    const { data: existing } = await sb
      .from('redeem_codes')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // ตรวจสอบว่า code ซ้ำหรือไม่ (ถ้ามีการเปลี่ยน)
    if (data.code && data.code.toUpperCase() !== existing.code) {
      const { data: codeExists } = await sb
        .from('redeem_codes')
        .select('id')
        .eq('code', data.code.toUpperCase())
        .neq('id', id)
        .maybeSingle();

      if (codeExists) {
        return NextResponse.json({ error: 'code_taken' }, { status: 409 });
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.code !== undefined) updateData.code = data.code.toUpperCase();
    if (data.points !== undefined) updateData.points = data.points;
    if (data.usage_limit !== undefined) updateData.usage_limit = data.usage_limit;
    if (data.valid_from !== undefined) updateData.valid_from = new Date(data.valid_from).toISOString();
    if (data.valid_until !== undefined) updateData.valid_until = data.valid_until ? new Date(data.valid_until).toISOString() : null;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.description !== undefined) updateData.description = data.description;

    const { data: updated, error } = await sb
      .from('redeem_codes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;

  const sb = createServiceClient();

  const { error } = await sb
    .from('redeem_codes')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}


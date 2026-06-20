import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const updatePriceSchema = z.object({
  price: z.number().min(0),
});

// PUT - อัปเดตราคา
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; priceId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id, priceId } = await params;
    const numericId = parseInt(id);
    const numericPriceId = parseInt(priceId);
    if (isNaN(numericId) || isNaN(numericPriceId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const body = await req.json();
    const validated = updatePriceSchema.parse(body);

    const sb = createServiceClient();

    // ตรวจสอบว่า price นี้เป็นของ game account นี้หรือไม่
    const { data: existing, error: checkError } = await sb
      .from('game_account_prices')
      .select('id')
      .eq('id', numericPriceId)
      .eq('game_account_id', numericId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'price_not_found' }, { status: 404 });
    }

    const { data, error } = await sb
      .from('game_account_prices')
      .update({
        price: validated.price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', numericPriceId)
      .select('*, permission:permissions(id, name)')
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('Update game account price error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// DELETE - ลบราคา
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; priceId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id, priceId } = await params;
    const numericId = parseInt(id);
    const numericPriceId = parseInt(priceId);
    if (isNaN(numericId) || isNaN(numericPriceId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const sb = createServiceClient();

    // ตรวจสอบว่า price นี้เป็นของ game account นี้หรือไม่
    const { data: existing, error: checkError } = await sb
      .from('game_account_prices')
      .select('id')
      .eq('id', numericPriceId)
      .eq('game_account_id', numericId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'price_not_found' }, { status: 404 });
    }

    const { error } = await sb
      .from('game_account_prices')
      .delete()
      .eq('id', numericPriceId);

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Delete game account price error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const updatePriceSchema = z.object({
  price: z.number().positive(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string; priceId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { priceId } = await params;
    const numericPriceId = parseInt(priceId);
    if (isNaN(numericPriceId)) {
      return NextResponse.json({ error: 'invalid_price_id' }, { status: 400 });
    }

    const body = await req.json();
    const validated = updatePriceSchema.parse(body);

    const sb = createServiceClient();

    // Update price
    const { data: price, error: priceError } = await sb
      .from('product_item_prices')
      .update({
        price: validated.price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', numericPriceId)
      .select('id, permission_id, price, permission:permissions(id, name)')
      .single();

    if (priceError) {
      return NextResponse.json({ error: 'db_error', detail: priceError.message }, { status: 500 });
    }

    if (!price) {
      return NextResponse.json({ error: 'price_not_found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: price,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('Product item price PUT error:', err);
    return NextResponse.json({ error: 'internal_error', detail: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string; priceId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { priceId } = await params;
    const numericPriceId = parseInt(priceId);
    if (isNaN(numericPriceId)) {
      return NextResponse.json({ error: 'invalid_price_id' }, { status: 400 });
    }

    const sb = createServiceClient();

    // Delete price
    const { error: deleteError } = await sb
      .from('product_item_prices')
      .delete()
      .eq('id', numericPriceId);

    if (deleteError) {
      return NextResponse.json({ error: 'db_error', detail: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (err) {
    console.error('Product item price DELETE error:', err);
    return NextResponse.json({ error: 'internal_error', detail: (err as Error).message }, { status: 500 });
  }
}


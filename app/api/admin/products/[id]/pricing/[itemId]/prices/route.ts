import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const createPriceSchema = z.object({
  permission_id: z.number().int().positive(),
  price: z.number().positive(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { itemId } = await params;
    const productItemId = parseInt(itemId);
    if (isNaN(productItemId)) {
      return NextResponse.json({ error: 'invalid_item_id' }, { status: 400 });
    }

    const sb = createServiceClient();

    // Get all prices for this product item
    const { data: prices, error: pricesError } = await sb
      .from('product_item_prices')
      .select('id, permission_id, price, permission:permissions(id, name)')
      .eq('product_item_id', productItemId)
      .order('permission_id', { ascending: true });

    if (pricesError) {
      return NextResponse.json({ error: 'db_error', detail: pricesError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: prices || [],
    });
  } catch (err) {
    console.error('Product item prices GET error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { itemId } = await params;
    const productItemId = parseInt(itemId);
    if (isNaN(productItemId)) {
      return NextResponse.json({ error: 'invalid_item_id' }, { status: 400 });
    }

    const body = await req.json();
    const validated = createPriceSchema.parse(body);

    const sb = createServiceClient();

    // Verify product item exists
    const { data: item } = await sb
      .from('product_items')
      .select('id')
      .eq('id', productItemId)
      .single();

    if (!item) {
      return NextResponse.json({ error: 'item_not_found' }, { status: 404 });
    }

    // Create or update price
    const { data: price, error: priceError } = await sb
      .from('product_item_prices')
      .upsert({
        product_item_id: productItemId,
        permission_id: validated.permission_id,
        price: validated.price,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'product_item_id,permission_id',
      })
      .select('id, permission_id, price, permission:permissions(id, name)')
      .single();

    if (priceError) {
      return NextResponse.json({ error: 'db_error', detail: priceError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: price,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('Product item price POST error:', err);
    return NextResponse.json({ error: 'internal_error', detail: (err as Error).message }, { status: 500 });
  }
}


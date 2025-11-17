import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const productId = parseInt(params.id, 10);
    const itemId = parseInt(params.itemId, 10);

    if (isNaN(productId) || isNaN(itemId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const sb = createServiceClient();

    // Ensure item belongs to product
    const { data: existing, error: existingError } = await sb
      .from('product_items')
      .select('id')
      .eq('id', itemId)
      .eq('product_id', productId)
      .single();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'item_not_found' }, { status: 404 });
    }

    const { error: deleteError } = await sb
      .from('product_items')
      .delete()
      .eq('id', itemId)
      .eq('product_id', productId);

    if (deleteError) {
      return NextResponse.json({ error: 'db_error', detail: deleteError.message }, { status: 500 });
    }

    try {
      revalidateTag('products');
      revalidateTag(`product-${productId}`);
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Product item delete error:', err);
    return NextResponse.json({ error: 'internal_error', detail: (err as Error).message }, { status: 500 });
  }
}



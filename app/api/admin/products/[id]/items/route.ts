import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'invalid_product_id' }, { status: 400 });
    }

    const sb = createServiceClient();
    
    const { data: items, error } = await sb
      .from('product_items')
      .select('id, name, sku, price, original_price, public_price, is_recommended, icon_url, is_flashsale, flashsale_price, flashsale_max_quantity, flashsale_duration_days, flashsale_start_date')
      .eq('product_id', productId)
      .order('is_recommended', { ascending: false })
      .order('id', { ascending: true });

    if (error) {
      console.error('[API] Product items GET error:', error);
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: items || [] });
  } catch (error) {
    console.error('[API] Product items GET unexpected error:', error);
    return NextResponse.json({ error: 'unexpected', detail: (error as Error).message }, { status: 500 });
  }
}


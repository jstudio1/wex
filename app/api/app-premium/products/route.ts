import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = createServiceClient();

  try {
    const { pct: globalPct, fix: globalFix } = await getGlobalMarkup();

    const { data: products, error } = await sb
      .from('app_premium_products')
      .select('id, provider_product_id, name, display_name, base_price, markup_percent, markup_fixed, stock, image_url, description, is_published')
      .eq('is_published', true)
      .order('name');

    if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });

    const productPayload = (products || []).map((product) => {
      const finalPrice = computePrice(
        Number(product.base_price || 0),
        Number(product.markup_percent || 0),
        Number(product.markup_fixed || 0),
        globalPct,
        globalFix
      );

      return {
        id: product.id,
        provider_product_id: product.provider_product_id,
        name: product.name,
        display_name: product.display_name || product.name,
        price: finalPrice,
        base_price: Number(product.base_price || 0),
        stock: product.stock || 0,
        image_url: product.image_url,
        description: product.description,
      };
    });

    return NextResponse.json({ data: productPayload });
  } catch (error) {
    console.error('App premium products error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


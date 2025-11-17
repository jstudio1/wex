import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';

type Params = { params: { id: string } };

export async function GET(req: Request, { params }: Params) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const sb = createServiceClient();
    const { pct: globalPct, fix: globalFix } = await getGlobalMarkup();

    const { data: product, error } = await sb
      .from('app_premium_products')
      .select('id, provider_product_id, name, display_name, base_price, markup_percent, markup_fixed, stock, image_url, icon_url, description, is_published, app_category, sub_category')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    if (!product) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const finalPrice = computePrice(
      Number(product.base_price || 0),
      Number(product.markup_percent || 0),
      Number(product.markup_fixed || 0),
      globalPct,
      globalFix
    );

    const productPayload = {
      id: product.id,
      provider_product_id: product.provider_product_id,
      name: product.name,
      display_name: product.display_name || product.name,
      price: finalPrice,
      base_price: Number(product.base_price || 0),
      stock: product.stock || 0,
      image_url: product.image_url,
      icon_url: product.icon_url,
      description: product.description,
      app_category: product.app_category || null,
      sub_category: product.sub_category || null,
    };

    return NextResponse.json({ ok: true, data: productPayload });
  } catch (err) {
    console.error('App premium product GET error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


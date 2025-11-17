import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'invalid_product_id' }, { status: 400 });
  }

  const sb = createServiceClient();

  try {
    const { pct: globalPct, fix: globalFix } = await getGlobalMarkup();

    const { data: product, error } = await sb
      .from('cashcard_products')
      .select('id, provider_product_id, category, name, display_name, base_price, recommended_price, discount, markup_percent, markup_fixed, image_url, info, format_id, is_published')
      .eq('id', productId)
      .eq('is_published', true)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    if (!product) {
      return NextResponse.json({ error: 'product_not_found' }, { status: 404 });
    }

    // Check if category is published and get display name
    let categoryDisplayName: string | null = null;
    if (product.category) {
      const { data: categoryData } = await sb
        .from('cashcard_categories')
        .select('display_name, is_published')
        .eq('category', product.category)
        .maybeSingle();
      
      if (categoryData && categoryData.is_published) {
        categoryDisplayName = categoryData.display_name || product.category;
      }
    }

    const finalPrice = computePrice(
      Number(product.base_price || 0),
      Number(product.markup_percent || 0),
      Number(product.markup_fixed || 0),
      globalPct,
      globalFix
    );

    return NextResponse.json({
      id: product.id,
      provider_product_id: product.provider_product_id,
      category: product.category,
      category_display_name: categoryDisplayName,
      name: product.name,
      display_name: product.display_name || product.name,
      price: finalPrice,
      base_price: Number(product.base_price || 0),
      recommended_price: product.recommended_price ? Number(product.recommended_price) : null,
      discount: product.discount ? Number(product.discount) : null,
      image_url: product.image_url,
      info: product.info,
      format_id: product.format_id,
    });
  } catch (error) {
    console.error('Cashcard product detail error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);
  
  const sb = createServiceClient();

  try {
    const { pct: globalPct, fix: globalFix } = await getGlobalMarkup();

    // Get category info
    const { data: categoryInfo, error: catError } = await sb
      .from('cashcard_categories')
      .select('category, display_name, is_published')
      .eq('category', decodedCategory)
      .eq('is_published', true)
      .maybeSingle();

    if (catError) {
      return NextResponse.json({ error: 'db_error', detail: catError.message }, { status: 500 });
    }

    if (!categoryInfo) {
      return NextResponse.json({ error: 'category_not_found' }, { status: 404 });
    }

    // Get products in this category
    const { data: products, error } = await sb
      .from('cashcard_products')
      .select('id, provider_product_id, category, name, display_name, base_price, recommended_price, discount, markup_percent, markup_fixed, image_url, info, format_id, is_published')
      .eq('category', decodedCategory)
      .eq('is_published', true)
      .order('base_price');

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    // Group products by price and calculate final prices
    const priceOptions = (products || []).map((product) => {
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
        base_price: Number(product.base_price || 0),
        price: finalPrice,
        recommended_price: product.recommended_price ? Number(product.recommended_price) : null,
        discount: product.discount ? Number(product.discount) : null,
        format_id: product.format_id,
        value: product.recommended_price ? Number(product.recommended_price) : Number(product.base_price || 0),
      };
    });

    // Get representative product for display (first product with image or first product)
    const representativeProduct = (products || []).find(p => p.image_url) || products?.[0];

    return NextResponse.json({
      category: categoryInfo.category,
      category_display_name: categoryInfo.display_name || categoryInfo.category,
      image_url: representativeProduct?.image_url || null,
      info: representativeProduct?.info || null,
      price_options: priceOptions,
    });
  } catch (error) {
    console.error('Cashcard category error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


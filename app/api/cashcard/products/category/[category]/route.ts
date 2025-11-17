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
    const { data: categoryData, error: catError } = await sb
      .from('cashcard_categories')
      .select('category, display_name, image_url, is_published')
      .eq('category', decodedCategory)
      .eq('is_published', true)
      .maybeSingle();

    if (catError) {
      return NextResponse.json({ error: 'db_error', detail: catError.message }, { status: 500 });
    }

    if (!categoryData) {
      return NextResponse.json({ error: 'category_not_found' }, { status: 404 });
    }

    // Get products in this category
    const { data: products, error } = await sb
      .from('cashcard_products')
      .select('id, provider_product_id, category, name, display_name, base_price, recommended_price, discount, markup_percent, markup_fixed, image_url, info, format_id, is_published')
      .eq('category', decodedCategory)
      .eq('is_published', true)
      .order('base_price');

    if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });

    // Get a representative image (first product with image, or first product)
    const representativeProduct = products?.find(p => p.image_url) || products?.[0];

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
        recommended_price: product.recommended_price ? Number(product.recommended_price) : null,
        discount: product.discount ? Number(product.discount) : null,
        format_id: product.format_id,
      };
    });

    return NextResponse.json({
      category: categoryData.category,
      category_display_name: categoryData.display_name || categoryData.category,
      category_image_url: categoryData.image_url || null,
      representative_image: representativeProduct?.image_url || null,
      representative_info: representativeProduct?.info || null,
      products: productPayload,
    });
  } catch (error) {
    console.error('Cashcard category products error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


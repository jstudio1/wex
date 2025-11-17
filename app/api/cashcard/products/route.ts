import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = createServiceClient();

  try {
    const { pct: globalPct, fix: globalFix } = await getGlobalMarkup();

    // Get published categories with display names
    const { data: publishedCategories, error: catError } = await sb
      .from('cashcard_categories')
      .select('category, display_name')
      .eq('is_published', true);

    if (catError) {
      console.error('Error fetching published categories:', catError);
    }

    const publishedCategorySet = new Set<string>(
      (publishedCategories || []).map((cat) => cat.category)
    );

    // Create category display name map
    const categoryDisplayMap = new Map<string, string>();
    (publishedCategories || []).forEach((cat) => {
      categoryDisplayMap.set(cat.category, cat.display_name || cat.category);
    });

    // Get published products
    const { data: products, error } = await sb
      .from('cashcard_products')
      .select('id, provider_product_id, category, name, display_name, base_price, recommended_price, discount, markup_percent, markup_fixed, image_url, info, format_id, is_published')
      .eq('is_published', true)
      .order('name');

    if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    
    // Filter products by published categories
    const filteredProducts = (products || []).filter((product) => {
      // If product has no category, show it
      if (!product.category) return true;
      // If product's category is published, show it
      return publishedCategorySet.has(product.category);
    });

    const productPayload = filteredProducts.map((product) => {
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
        category: product.category,
        category_display_name: product.category ? (categoryDisplayMap.get(product.category) || product.category) : null,
        name: product.name,
        display_name: product.display_name || product.name,
        price: finalPrice,
        base_price: Number(product.base_price || 0),
        recommended_price: product.recommended_price ? Number(product.recommended_price) : null,
        discount: product.discount ? Number(product.discount) : null,
        image_url: product.image_url,
        info: product.info,
        format_id: product.format_id,
      };
    });

    return NextResponse.json({ data: productPayload });
  } catch (error) {
    console.error('Cashcard products error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


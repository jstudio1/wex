import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = createServiceClient();
    
    // Get global markup
    let gpct = 0;
    let gfix = 0;
    try {
      const markup = await getGlobalMarkup();
      gpct = markup.pct;
      gfix = markup.fix;
    } catch (markupErr) {
      console.error('[GET /api/products/flashsale] Error fetching global markup:', markupErr);
    }
    
    // First, fetch flashsale products
    const { data: products, error: perr } = await sb
      .from('products')
      .select('id, name, key, image_url, badge_enabled, badge_percent, badge_text, badge_apply_price, is_published, is_flashsale')
      .eq('is_published', true)
      .eq('is_flashsale', true)
      .eq('product_type', 'gtopup')
      .order('id', { ascending: false })
      .limit(20);
    
    if (perr) {
      console.error('[GET /api/products/flashsale] Error fetching products:', perr);
      return NextResponse.json({ error: 'db_error', detail: perr.message }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const productIds = products.map((p: any) => p.id);

    // Fetch flashsale product items (only items that are marked as flashsale)
    const { data: items, error: ierr } = await sb
      .from('product_items')
      .select('id, product_id, name, sku, price, original_price, public_price, agent_discount_percent, agent_cost_price, markup_percent, markup_fixed, is_recommended, icon_url, is_flashsale, flashsale_price, flashsale_max_quantity, flashsale_duration_days, flashsale_start_date')
      .in('product_id', productIds)
      .eq('is_flashsale', true)
      .order('is_recommended', { ascending: false })
      .order('id', { ascending: true });
    
    if (ierr) {
      console.error('[GET /api/products/flashsale] Error fetching product_items:', ierr);
      return NextResponse.json({ error: 'db_error', detail: ierr.message }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Create product map for quick lookup
    const productMap = new Map(products.map((p: any) => [p.id, p]));

    // Get orders count for each item
    const itemIds = items.map((it: any) => it.id);
    const { data: orderRows } = await sb
      .from('orders')
      .select('item_id, created_at, state')
      .in('item_id', itemIds)
      .in('state', ['completed', 'processing', 'pending']);
    
    const countByItem = new Map<number, number>();
    const quantitySoldByItem = new Map<number, number>();
    const todayCountByItem = new Map<number, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const r of orderRows || []) {
      const itemId = (r as any).item_id as number;
      const createdAt = new Date((r as any).created_at);
      
      // นับจำนวน orders (แต่ละ order = 1 ชิ้น)
      countByItem.set(itemId, (countByItem.get(itemId) || 0) + 1);
      quantitySoldByItem.set(itemId, (quantitySoldByItem.get(itemId) || 0) + 1);
      
      if (createdAt >= today) {
        todayCountByItem.set(itemId, (todayCountByItem.get(itemId) || 0) + 1);
      }
    }

    // Build response - one entry per flashsale item
    const now = new Date();
    const result = items
      .map((it: any) => {
        const product = productMap.get(it.product_id);
        if (!product) return null;
        
        // Check if item is still within sale duration
        let isActive = true;
        let daysRemaining = null;
        
        if (it.flashsale_start_date && it.flashsale_duration_days) {
          const startDate = new Date(it.flashsale_start_date);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + Number(it.flashsale_duration_days));
          
          if (now > endDate) {
            isActive = false;
          } else {
            const diff = endDate.getTime() - now.getTime();
            daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
          }
        }
        
        // Check if item has reached max quantity
        const maxQuantity = it.flashsale_max_quantity ? Number(it.flashsale_max_quantity) : null;
        const quantitySold = quantitySoldByItem.get(it.id) || 0;
        const quantityRemaining = maxQuantity !== null ? Math.max(0, maxQuantity - quantitySold) : null;
        
        if (maxQuantity !== null && quantitySold >= maxQuantity) {
          isActive = false;
        }
        
        // Skip inactive items
        if (!isActive) return null;
        
        const agentCost = Number(it.agent_cost_price ?? it.price ?? 0);
        const publicPrice = Number(it.public_price ?? it.original_price ?? agentCost);
        const pct = Number(it.markup_percent ?? 0);
        const fix = Number(it.markup_fixed ?? 0);
        const computed = computePrice(agentCost, pct, fix, gpct, gfix);
        
        // Use item's flashsale_price if available, otherwise use computed price
        const displayPrice = it.flashsale_price 
          ? Number(it.flashsale_price).toFixed(2)
          : computed.toFixed(2);
        
        const originalPrice = publicPrice.toFixed(2);
        const currentPrice = Number(displayPrice);
        const originalPriceNum = Number(originalPrice);
        
        // Calculate savings
        let savings = 0;
        if (it.flashsale_price) {
          // If flashsale_price is set, calculate savings from original price
          savings = originalPriceNum > currentPrice ? originalPriceNum - currentPrice : 0;
        } else if (product.badge_enabled && product.badge_apply_price) {
          // Otherwise use badge discount
          const regularPrice = computed;
          if (originalPriceNum > regularPrice) {
            savings = originalPriceNum - regularPrice;
          }
        }
        
        return {
          id: product.id,
          itemId: it.id,
          name: product.name,
          key: product.key,
          image_url: product.image_url,
          badge_enabled: product.badge_enabled,
          badge_percent: product.badge_percent,
          badge_text: product.badge_text,
          badge_apply_price: product.badge_apply_price,
          item: {
            id: it.id,
            name: it.name,
            price: displayPrice,
            originalPrice: originalPrice,
            icon_url: it.icon_url || null,
          },
          savings: savings.toFixed(2),
          totalSold: countByItem.get(it.id) || 0,
          todaySold: todayCountByItem.get(it.id) || 0,
          maxQuantity: maxQuantity,
          quantitySold: quantitySold,
          quantityRemaining: quantityRemaining,
          daysRemaining: daysRemaining,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[GET /api/products/flashsale] Unexpected error:', error);
    return NextResponse.json({ error: 'unexpected', detail: (error as Error).message }, { status: 500 });
  }
}


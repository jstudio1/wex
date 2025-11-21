import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const sb = createServiceClient();
    
    // Get global markup with error handling
    let gpct = 0;
    let gfix = 0;
    try {
      const markup = await getGlobalMarkup();
      gpct = markup.pct;
      gfix = markup.fix;
    } catch (markupErr) {
      console.error('[GET /api/cashcard/wepay] Error fetching global markup:', markupErr);
    }
    
    const { data: products, error: perr } = await sb
      .from('products')
      .select('id, name, key, image_url, badge_enabled, badge_percent, badge_text, badge_apply_price')
      .eq('is_published', true)
      .eq('product_type', 'cashcard');
    
    if (perr) {
      console.error('[GET /api/cashcard/wepay] Error fetching products:', perr);
      return NextResponse.json({ error: 'db_error', detail: perr.message }, { status: 500 });
    }

    const { data: items, error: ierr } = await sb
      .from('product_items')
      .select('id, product_id, name, sku, price, original_price, public_price, agent_discount_percent, agent_cost_price, markup_percent, markup_fixed, is_recommended, icon_url')
      .in('product_id', (products || []).map(p => (p as any).id));
    
    if (ierr) {
      console.error('[GET /api/cashcard/wepay] Error fetching product_items:', ierr);
      return NextResponse.json({ error: 'db_error', detail: ierr.message }, { status: 500 });
    }

    // orders count per product
    const { data: orderRows, error: orderErr } = await sb
      .from('orders')
      .select('product_id')
      .eq('product_type', 'cashcard');
    
    if (orderErr) {
      console.error('[GET /api/cashcard/wepay] Error fetching orders:', orderErr);
    }
    
    const countByProduct = new Map<number, number>();
    for (const r of orderRows || []) {
      const pid = (r as any).product_id as number;
      countByProduct.set(pid, (countByProduct.get(pid) || 0) + 1);
    }

    const itemsByProduct = new Map<number, any[]>();
    for (const it of items || []) {
      const arr = itemsByProduct.get(it.product_id as number) || [];
      const agentCost = Number((it as any).agent_cost_price ?? it.price ?? 0);
      const publicPrice = Number((it as any).public_price ?? it.original_price ?? agentCost);
      const pct = Number((it as any).markup_percent ?? 0);
      const fix = Number((it as any).markup_fixed ?? 0);
      const computed = computePrice(agentCost, pct, fix, gpct, gfix);
      const originalPriceStr = Number.isFinite(publicPrice) ? publicPrice.toFixed(2) : '0.00';
      const agentCostStr = Number.isFinite(agentCost) ? agentCost.toFixed(2) : '0.00';
      arr.push({
        id: it.id,
        name: it.name,
        sku: it.sku,
        price: computed.toFixed(2),
        originalPrice: originalPriceStr,
        agentCost: agentCostStr,
        agentDiscountPercent: Number((it as any).agent_discount_percent ?? 0),
        is_recommended: Boolean((it as any).is_recommended),
        icon_url: (it as any).icon_url || null
      });
      itemsByProduct.set(it.product_id as number, arr);
    }

    const result = (products || []).map((p) => {
      const pid = (p as any).id as number;
      return {
        id: pid,
        name: (p as any).name as string,
        key: (p as any).key as string,
        image_url: (p as any).image_url as string | null,
        items: itemsByProduct.get(pid) || [],
        ordersCount: countByProduct.get(pid) || 0,
        badge: (p as any).badge_enabled
          ? {
              text: (p as any).badge_text as string | null,
              percent: (p as any).badge_percent as number | null,
            }
          : null,
      };
    });

    // Sort: products with images first, then by ordersCount desc, then name
    result.sort((a, b) => {
      const ai = a.image_url ? 1 : 0;
      const bi = b.image_url ? 1 : 0;
      if (bi !== ai) return bi - ai;
      if ((b.ordersCount || 0) !== (a.ordersCount || 0)) return (b.ordersCount || 0) - (a.ordersCount || 0);
      return String(a.name).localeCompare(String(b.name));
    });

    return NextResponse.json(
      { data: result },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err) {
    console.error('[GET /api/cashcard/wepay] Unexpected error:', err);
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}


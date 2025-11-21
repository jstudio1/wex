import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';
import { getAuthUser } from '@/lib/auth';

type Params = { params: { key: string } };

export async function GET(req: Request, { params }: Params) {
  try {
    const { key } = params;
    const sb = createServiceClient();
    const { data: product, error: perr } = await sb
      .from('products')
      .select('*')
      .eq('key', key)
      .eq('is_published', true)
      .eq('product_type', 'cashcard')
      .maybeSingle();
    
    if (perr) {
      console.error('[API] Cashcard wepay [key] GET error:', perr);
      return NextResponse.json({ error: 'db_error', detail: perr.message }, { status: 500 });
    }
    if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const iconUrl = (product as any).icon_url || null;

    const { pct: gpct, fix: gfix } = await getGlobalMarkup();
    const productId = Number(product.id);
    
    // Get user permission_id if available
    let userPermissionId: number | null = null;
    try {
      const user = await getAuthUser();
      if (user) {
        const { data: userData } = await sb
          .from('users')
          .select('permission_id')
          .eq('id', user.id)
          .maybeSingle();
        if (userData?.permission_id) {
          userPermissionId = userData.permission_id;
        }
      }
    } catch {
      // ignore
    }

    const { searchParams } = new URL(req.url);
    const permissionIdParam = searchParams.get('permission_id');
    if (permissionIdParam && !userPermissionId) {
      userPermissionId = parseInt(permissionIdParam) || null;
    }
    
    const { data: items, error: ierr } = await sb
      .from('product_items')
      .select('id, name, sku, price, original_price, public_price, agent_cost_price, agent_discount_percent, markup_percent, markup_fixed, is_recommended, icon_url')
      .eq('product_id', productId);
    
    if (ierr) return NextResponse.json({ error: 'db_error', detail: ierr.message }, { status: 500 });

    // Fetch custom prices if user has permission
    let customPricesMap = new Map<number, number>();
    if (userPermissionId) {
      const itemIds = (items || []).map(i => i.id);
      if (itemIds.length > 0) {
        const { data: customPrices } = await sb
          .from('product_item_prices')
          .select('product_item_id, price')
          .eq('permission_id', userPermissionId)
          .in('product_item_id', itemIds);
        
        if (customPrices) {
          for (const cp of customPrices) {
            customPricesMap.set(cp.product_item_id, Number(cp.price));
          }
        }
      }
    }

    // Cashcard ไม่ต้องใช้ inputs
    const finalInputs: any[] = [];

    const badgeEnabled = Boolean((product as any).badge_enabled);
    const badgePercentRaw = (product as any).badge_percent as number | null;
    const badgePercent = typeof badgePercentRaw === 'number' ? badgePercentRaw : badgePercentRaw != null ? Number(badgePercentRaw) : null;
    const badgeTextRaw = (product as any).badge_text as string | null;
    const badgeText = badgeTextRaw && badgeTextRaw.trim().length ? badgeTextRaw.trim() : null;
    const percentDisplay = badgePercent != null && badgePercent > 0 ? `${badgePercent}% OFF` : null;
    const badgeDisplay = badgeText || percentDisplay;

    const applyDiscount = Boolean((product as any).badge_apply_price) && badgePercent != null && badgePercent > 0;

    const finalIconUrl = iconUrl && typeof iconUrl === 'string' && iconUrl.trim().length > 0 
      ? iconUrl.trim() 
      : null;

    const mappedItems = (items || []).map((i) => {
      const publicPrice = Number((i as any).public_price ?? i.original_price ?? i.price ?? 0);
      const agentCost = Number((i as any).agent_cost_price ?? i.price ?? 0);
      const pct = Number((i as any).markup_percent ?? 0);
      const fix = Number((i as any).markup_fixed ?? 0);
      const computed = computePrice(agentCost, pct, fix, gpct, gfix);
      
      const customPrice = customPricesMap.get(i.id);
      let finalPrice: number;
      let originalPriceForPermission: number | null = null;
      
      if (customPrice !== undefined) {
        finalPrice = customPrice;
        originalPriceForPermission = applyDiscount 
          ? Math.max(0, computed * (1 - (badgePercent as number) / 100))
          : computed;
      } else {
        finalPrice = applyDiscount ? Math.max(0, computed * (1 - (badgePercent as number) / 100)) : computed;
      }
      
      return {
        id: i.id,
        name: i.name,
        is_recommended: Boolean((i as any).is_recommended),
        sku: i.sku,
        price: finalPrice.toFixed(2),
        priceValue: finalPrice,
        originalPrice: Number.isFinite(publicPrice) ? publicPrice.toFixed(2) : '0.00',
        agentCost: Number.isFinite(agentCost) ? agentCost.toFixed(2) : '0.00',
        agentDiscountPercent: Number((i as any).agent_discount_percent ?? 0),
        original_price_for_permission: originalPriceForPermission !== null ? originalPriceForPermission.toFixed(2) : null,
        icon_url: (i as any).icon_url || null
      };
    });

    mappedItems.sort((a, b) => {
      if (a.is_recommended && !b.is_recommended) return -1;
      if (!a.is_recommended && b.is_recommended) return 1;
      return a.priceValue - b.priceValue;
    });

    const finalItems = mappedItems.map(({ priceValue, ...rest }) => rest);

    const mapped = {
      id: product.id,
      name: product.name,
      key: product.key,
      image_url: (product as any).image_url || null,
      banner_url: (product as any).banner_url || null,
      icon_url: finalIconUrl,
      badge: badgeEnabled && badgeDisplay ? { text: badgeDisplay, percent: badgePercent } : null,
      items: finalItems,
      inputs: finalInputs
    };

    return NextResponse.json(
      { data: mapped },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'unexpected' }, { status: 500 });
  }
}


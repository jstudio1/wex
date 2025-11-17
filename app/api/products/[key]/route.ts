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
      .maybeSingle();
    if (perr) {
      console.error('[API] Products [key] GET error:', perr);
      return NextResponse.json({ error: 'db_error', detail: perr.message }, { status: 500 });
    }
    if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Get icon_url from product object
    const iconUrl = (product as any).icon_url || null;

    const { pct: gpct, fix: gfix } = await getGlobalMarkup();
    const productId = Number(product.id); // แปลงเป็น number เพื่อให้แน่ใจว่า type ถูกต้อง
    
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

    // Also check query parameter for permission_id (for server-side rendering)
    const { searchParams } = new URL(req.url);
    const permissionIdParam = searchParams.get('permission_id');
    if (permissionIdParam && !userPermissionId) {
      userPermissionId = parseInt(permissionIdParam) || null;
    }
    
    const { data: items, error: ierr } = await sb
      .from('product_items')
      .select('id, name, sku, price, original_price, markup_percent, markup_fixed, is_recommended, icon_url')
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

    const { data: inputs, error: inperr } = await sb
      .from('product_inputs')
      .select('id, key, title, regex, type, placeholder')
      .eq('product_id', productId);
    
    if (inperr) {
      console.error('[API] product_inputs query error:', inperr);
      return NextResponse.json({ error: 'db_error', detail: inperr.message }, { status: 500 });
    }

    // Sort inputs by id (ทำใน JavaScript แทนการใช้ .order() เพราะอาจมีปัญหา)
    const sortedInputs = inputs && inputs.length > 0 
      ? inputs.sort((a: any, b: any) => (a.id || 0) - (b.id || 0))
      : (inputs || []);

    // ใช้ inputs จาก DB โดยตรง ไม่ใส่ default
    // ถ้ายังไม่มี inputs แสดงว่ายังไม่ได้ sync หรือบริการนั้นไม่ต้องการ inputs
    const finalInputs = sortedInputs || [];

    const inputIds = finalInputs.map((x) => x.id);
    let optionsByInput = new Map<number, { label: string; value: string }[]>();
    if (inputIds.length) {
      const { data: options, error: oerr } = await sb
        .from('product_input_options')
        .select('id, input_id, label, value')
        .in('input_id', inputIds)
        .order('id');
      if (oerr) return NextResponse.json({ error: 'db_error', detail: oerr.message }, { status: 500 });
      for (const o of options || []) {
        const arr = optionsByInput.get(o.input_id as number) || [];
        arr.push({ label: o.label, value: o.value });
        optionsByInput.set(o.input_id as number, arr);
      }
    }

    const badgeEnabled = Boolean((product as any).badge_enabled);
    const badgePercentRaw = (product as any).badge_percent as number | null;
    const badgePercent = typeof badgePercentRaw === 'number' ? badgePercentRaw : badgePercentRaw != null ? Number(badgePercentRaw) : null;
    const badgeTextRaw = (product as any).badge_text as string | null;
    const badgeText = badgeTextRaw && badgeTextRaw.trim().length ? badgeTextRaw.trim() : null;
    const percentDisplay = badgePercent != null && badgePercent > 0 ? `${badgePercent}% OFF` : null;
    const badgeDisplay = badgeText || percentDisplay;

    const applyDiscount = Boolean((product as any).badge_apply_price) && badgePercent != null && badgePercent > 0;

    // Process icon_url
    const finalIconUrl = iconUrl && typeof iconUrl === 'string' && iconUrl.trim().length > 0 
      ? iconUrl.trim() 
      : null;

    // Map items and calculate prices
    const mappedItems = (items || []).map((i) => {
      const base = Number(i.price ?? 0);
      const pct = Number((i as any).markup_percent ?? 0);
      const fix = Number((i as any).markup_fixed ?? 0);
      const computed = computePrice(base, pct, fix, gpct, gfix);
      
      // Check if there's a custom price for this item
      const customPrice = customPricesMap.get(i.id);
      let finalPrice: number;
      let originalPriceForPermission: number | null = null;
      
      if (customPrice !== undefined) {
        // Use custom price
        finalPrice = customPrice;
        originalPriceForPermission = applyDiscount 
          ? Math.max(0, computed * (1 - (badgePercent as number) / 100))
          : computed;
      } else {
        // Use computed price
        finalPrice = applyDiscount ? Math.max(0, computed * (1 - (badgePercent as number) / 100)) : computed;
      }
      
      return {
        id: i.id,
        name: i.name,
        is_recommended: Boolean((i as any).is_recommended),
        sku: i.sku,
        price: finalPrice.toFixed(2),
        priceValue: finalPrice, // Keep numeric value for sorting
        originalPrice: String(i.original_price || computed.toFixed(2)),
        original_price_for_permission: originalPriceForPermission !== null ? originalPriceForPermission.toFixed(2) : null,
        icon_url: (i as any).icon_url || null
      };
    });

    // Sort items by price (ascending) - recommended items first if same price
    mappedItems.sort((a, b) => {
      // Recommended items come first
      if (a.is_recommended && !b.is_recommended) return -1;
      if (!a.is_recommended && b.is_recommended) return 1;
      // Then sort by price
      return a.priceValue - b.priceValue;
    });

    // Remove priceValue before returning (not needed in response)
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
      inputs: finalInputs.map((inp) => ({
        key: inp.key,
        title: inp.title,
        regex: inp.regex || '',
        type: inp.type || 'text',
        placeholder: inp.placeholder || '',
        options: optionsByInput.get(inp.id) || []
      }))
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



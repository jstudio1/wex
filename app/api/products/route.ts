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
      console.error('[GET /api/products] Error fetching global markup:', markupErr);
      // Continue with default values (0, 0)
    }
    
    const url = new URL(req.url);
    const categorySlug = url.searchParams.get('category');
    const idsParam = url.searchParams.get('ids');
    
    let productsQuery = sb
      .from('products')
      .select('id, name, key, image_url, badge_enabled, badge_percent, badge_text, badge_apply_price')
      .eq('is_published', true);
    
    // Support fetching by IDs for admin orders
    if (idsParam) {
      const ids = idsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
      if (ids.length > 0) {
        productsQuery = productsQuery.in('id', ids);
      }
    }
    
    const { data: products, error: perr } = await productsQuery;
    if (perr) {
      console.error('[GET /api/products] Error fetching products:', perr);
      return NextResponse.json({ error: 'db_error', detail: perr.message }, { status: 500 });
    }

    const { data: items, error: ierr } = await sb
      .from('product_items')
      .select('id, product_id, name, sku, price, original_price, markup_percent, markup_fixed, is_recommended, icon_url');
    if (ierr) {
      console.error('[GET /api/products] Error fetching product_items:', ierr);
      return NextResponse.json({ error: 'db_error', detail: ierr.message }, { status: 500 });
    }

    // orders count per product (reduce on client for compatibility)
    const { data: orderRows, error: orderErr } = await sb
      .from('orders')
      .select('product_id');
    if (orderErr) {
      console.error('[GET /api/products] Error fetching orders:', orderErr);
    }
    const countByProduct = new Map<number, number>();
    for (const r of orderRows || []) {
      const pid = (r as any).product_id as number;
      countByProduct.set(pid, (countByProduct.get(pid) || 0) + 1);
    }

    const itemsByProduct = new Map<number, any[]>();
    for (const it of items || []) {
      const arr = itemsByProduct.get(it.product_id as number) || [];
      const base = Number(it.price ?? 0);
      const pct = Number((it as any).markup_percent ?? 0);
      const fix = Number((it as any).markup_fixed ?? 0);
      const computed = computePrice(base, pct, fix, gpct, gfix);
      arr.push({
        id: it.id,
        name: it.name,
        sku: it.sku,
        price: computed.toFixed(2),
        originalPrice: String(it.original_price),
        is_recommended: Boolean((it as any).is_recommended),
        icon_url: (it as any).icon_url || null
      });
      itemsByProduct.set(it.product_id as number, arr);
    }

    // categories map
    const { data: pc, error: pcerr } = await sb
      .from('product_categories')
      .select('product_id, category_id');
    if (pcerr) {
      console.error('[GET /api/products] Error fetching product_categories:', pcerr);
    }
    
    const { data: cats, error: catserr } = await sb
      .from('categories')
      .select('id, slug, name')
      .eq('is_published', true);
    if (catserr) {
      console.error('[GET /api/products] Error fetching categories:', catserr);
    }
    const catsByProduct = new Map<number, { slug: string; name: string }[]>();
    for (const row of pc || []) {
      const pid = (row as any).product_id as number;
      const cid = (row as any).category_id as number;
      const cat = (cats || []).find((c) => (c as any).id === cid);
      if (cat) {
        const arr = catsByProduct.get(pid) || [];
        arr.push({ slug: (cat as any).slug as string, name: (cat as any).name as string });
        catsByProduct.set(pid, arr);
      }
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
        categories: catsByProduct.get(pid) || [],
        badge: (p as any).badge_enabled
          ? {
              text: (p as any).badge_text as string | null,
              percent: (p as any).badge_percent as number | null,
            }
          : null,
      };
    });

    // Sort: products with images first, then by ordersCount desc, then name
    const sortWithImageFirst = (list: any[]) =>
      list.sort((a, b) => {
        const ai = a.image_url ? 1 : 0;
        const bi = b.image_url ? 1 : 0;
        if (bi !== ai) return bi - ai;
        // secondary: popular first
        if ((b.ordersCount || 0) !== (a.ordersCount || 0)) return (b.ordersCount || 0) - (a.ordersCount || 0);
        // fallback: name
        return String(a.name).localeCompare(String(b.name));
      });

    // Filter by category if provided
    if (categorySlug) {
      const filtered = result.filter((p) => p.categories.some((c) => c.slug === categorySlug));
      sortWithImageFirst(filtered);
      return NextResponse.json(
        { data: filtered },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    sortWithImageFirst(result);
    return NextResponse.json(
      { data: result },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err) {
    console.error('[GET /api/products] Unexpected error:', err);
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

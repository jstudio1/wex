import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-keys';

const API_URL = 'https://api.peamsub24hr.com/v2/app-premium';

type ProviderProduct = {
  id: number;
  name: string;
  pricevip: number;
  stock: number;
  img?: string;
  des?: string;
};

type ExistingProduct = {
  id: number;
  provider_product_id: number;
  display_name: string;
  markup_percent: number;
  markup_fixed: number;
  is_published: boolean;
};

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = await getApiKey('peamsubapi');
  if (!apiKey) {
    return NextResponse.json({ error: 'missing_peamsub_api_key' }, { status: 500 });
  }

  const sb = createServiceClient();

  try {
    // Encode API key ด้วย Base64
    const encodedKey = Buffer.from(apiKey).toString('base64');

    // เรียก Peamsub API
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${encodedKey}`,
        'Content-Type': 'application/json',
      },
    });

    const json = await response.json();
    
    if (!response.ok || json.statusCode !== 200 || !Array.isArray(json.data)) {
      return NextResponse.json({ 
        error: 'provider_error', 
        detail: json?.error || json?.message || json 
      }, { status: 502 });
    }

    const products = json.data as ProviderProduct[];

    // ดึงสินค้าที่มีอยู่แล้วจาก database
    const { data: existingProducts } = await sb
      .from('app_premium_products')
      .select('id, provider_product_id, display_name, markup_percent, markup_fixed, is_published');

    const existingMap = new Map<number, ExistingProduct>();
    for (const product of (existingProducts || []) as ExistingProduct[]) {
      existingMap.set(product.provider_product_id, product);
    }

    const keepProviderIds = new Set<number>();
    let upserted = 0;

    for (const product of products) {
      const providerId = product.id;
      if (!providerId) continue;
      keepProviderIds.add(providerId);

      const existing = existingMap.get(providerId);

      const payload: Record<string, unknown> = {
        provider_product_id: providerId,
        name: product.name,
        base_price: Number(product.pricevip) || 0,
        stock: Number(product.stock) || 0,
        image_url: product.img || null,
        description: product.des || null,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        // เก็บค่าเดิมของ display_name, markup_percent, markup_fixed, is_published
        payload.id = existing.id;
        payload.display_name = existing.display_name;
        payload.markup_percent = existing.markup_percent ?? 0;
        payload.markup_fixed = existing.markup_fixed ?? 0;
        payload.is_published = existing.is_published ?? false;
      } else {
        // สินค้าใหม่
        payload.display_name = product.name;
        payload.markup_percent = 0;
        payload.markup_fixed = 0;
        payload.is_published = false;
      }

      const { error: upsertError } = await sb
        .from('app_premium_products')
        .upsert(payload, { onConflict: 'provider_product_id' });

      if (upsertError) {
        console.error('App premium product upsert error', upsertError);
        continue;
      }
      upserted += 1;
    }

    // ซ่อนสินค้าที่ไม่มีใน API แล้ว
    if (existingProducts?.length) {
      const missing = existingProducts
        .map((p) => p.provider_product_id)
        .filter((id) => !keepProviderIds.has(id));
      
      if (missing.length) {
        await sb
          .from('app_premium_products')
          .update({ is_published: false })
          .in('provider_product_id', missing);
      }
    }

    return NextResponse.json({ ok: true, counts: { products: upserted } });
  } catch (error) {
    console.error('App premium sync error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

const API_URL = 'https://otp24hr.com/api/v1?action=getpack';

type ProviderProduct = {
  type_code: string | number;
  app?: string;
  name: string;
  img?: string;
  img_cover?: string;
  img_icon?: string;
  msg?: string;
  msg_groups?: string;
  name_groups?: string;
  groups?: string;
  price?: number | string;
  price_agent?: number | string;
  exp?: string | number;
  amount?: number | string;
};

type ExistingProduct = {
  id: number;
  provider_product_id: number;
  display_name: string | null;
  markup_percent: number;
  markup_fixed: number;
  is_published: boolean;
};

async function performSync() {
  const sb = createServiceClient();

  try {
    // เรียก OTP24HR API (ไม่มี auth ตามเอกสารที่ให้มา)
    const response = await fetch(API_URL, { method: 'GET' });

    if (!response.ok) {
      return NextResponse.json({ error: 'provider_error', detail: `HTTP ${response.status}` }, { status: 502 });
    }

    const json = await response.json();
    
    // รูปแบบผลลัพธ์อาจเป็น array ตรงๆ หรือห่อใน data
    const list: unknown = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
    if (!Array.isArray(list)) {
      return NextResponse.json({ error: 'provider_error', detail: 'unexpected_response_format' }, { status: 502 });
    }

    const products = (list as ProviderProduct[]).filter((p) => !!p && p.name);

    // ดึงสินค้าที่มีอยู่แล้วจาก database
    const { data: existingProducts, error: exErr } = await sb
      .from('app_premium_products')
      .select('id, provider_product_id, display_name, markup_percent, markup_fixed, is_published');

    if (exErr) {
      return NextResponse.json({ error: 'db_error', detail: exErr.message }, { status: 500 });
    }

    // ดึงหมวดหมู่ที่มีอยู่แล้ว
    const { data: existingCategories, error: catErr } = await sb
      .from('app_premium_categories')
      .select('id, category, display_name, filter_keywords, is_published, display_order, icon_url');

    if (catErr) {
      return NextResponse.json({ error: 'db_error', detail: catErr.message }, { status: 500 });
    }

    const existingMap = new Map<number, ExistingProduct>();
    for (const product of (existingProducts || []) as ExistingProduct[]) {
      existingMap.set(product.provider_product_id, product);
    }

    const categoryMap = new Map<string, { id?: number; category: string; display_name: string | null; filter_keywords: string[]; is_published: boolean; display_order: number; icon_url: string | null }>();
    for (const c of existingCategories || []) {
      categoryMap.set(c.category, {
        id: c.id,
        category: c.category,
        display_name: c.display_name,
        filter_keywords: Array.isArray(c.filter_keywords) ? c.filter_keywords : [],
        is_published: c.is_published ?? true,
        display_order: typeof c.display_order === 'number' ? c.display_order : 0,
        icon_url: c.icon_url || null,
      });
    }

    const keepProviderIds = new Set<number>();
    let upserted = 0;

    // Helper: slugify for category key
    const slugify = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    // Track new categories discovered from provider response
    const discoveredCategoryData = new Map<string, { category: string; display_name: string; keywords: Set<string>; icon_url: string | null }>();

    for (const item of products) {
      // provider_product_id ต้องเป็นตัวเลขตามสคีมา ถ้าพาร์สไม่ได้ให้ข้าม
      const providerIdNum = Number(item.type_code);
      if (!Number.isFinite(providerIdNum)) continue;
      keepProviderIds.add(providerIdNum);

      const existing = existingMap.get(providerIdNum);

      const rawName = item.name || '';
      const rawMsg = item.msg || '';

      const extraLines: string[] = [];
      if (item.app) extraLines.push(`ประเภท: ${item.app}`);
      if (item.name_groups) extraLines.push(`กลุ่ม: ${item.name_groups}`);
      if (item.msg_groups) extraLines.push(`แท็ก: ${item.msg_groups}`);
      if (item.exp !== undefined && item.exp !== null && String(item.exp).length > 0) extraLines.push(`วันหมดอายุ/รับประกัน: ${item.exp}`);

      // Combine raw message with extra info, using <br> for separation
      const finalDescription = [rawMsg, extraLines.join('<br>')].filter(Boolean).join('<br><br>');

      const payload: Record<string, unknown> = {
        provider_product_id: providerIdNum,
        name: rawName,
        base_price: Number(item.price_agent ?? item.price) || 0,
        stock: Number(item.amount ?? 0) || 0,
        image_url: item.img_cover || item.img_icon || item.img || null,
        icon_url: item.img_icon || item.img || null,
        description: finalDescription || null,
        app_category: item.app ? String(item.app).trim() : null,
        sub_category: item.name_groups ? String(item.name_groups).trim() : null,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        // อัพเดทข้อมูลจาก API แต่รักษาค่าที่แอดมินตั้งไว้ (display_name, markup, is_published)
        payload.id = existing.id;
        payload.display_name = existing.display_name ?? item.name;
        payload.markup_percent = existing.markup_percent ?? 0;
        payload.markup_fixed = existing.markup_fixed ?? 0;
        payload.is_published = existing.is_published ?? false;
      } else {
        // สินค้าใหม่ - ใช้ข้อมูลจาก API ทั้งหมด
        payload.display_name = item.name;
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

      // Build category data from provider fields - ใช้แค่ app
      if (item.app && String(item.app).trim()) {
        const appTrimmed = String(item.app).trim();
        const catKey = slugify(appTrimmed);
        if (catKey) {
          const displayName = appTrimmed;
          const iconUrl = item.img_icon || item.img || null;
          const existingCat = categoryMap.get(catKey);
          const keywords = new Set<string>(
            (existingCat?.filter_keywords || []).map((k: string) => k.toLowerCase())
          );
          // ใช้แค่ app เป็น keyword
          if (appTrimmed) keywords.add(appTrimmed.toLowerCase());

          const merged = discoveredCategoryData.get(catKey) || {
            category: catKey,
            display_name: displayName,
            keywords: new Set<string>(),
            icon_url: iconUrl,
          };
          // merge
          for (const k of keywords) merged.keywords.add(k);
          if (!merged.display_name && displayName) merged.display_name = displayName;
          if (!merged.icon_url && iconUrl) merged.icon_url = iconUrl;
          discoveredCategoryData.set(catKey, merged);
        }
      }
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

    // Upsert categories discovered - แยก update และ insert
    let categoriesUpserted = 0;
    if (discoveredCategoryData.size) {
      const currentMaxOrder = Math.max(0, ...Array.from(categoryMap.values()).map(c => c.display_order || 0));
      let nextOrder = Number.isFinite(currentMaxOrder) ? currentMaxOrder + 1 : 0;

      const toUpdate: any[] = [];
      const toInsert: any[] = [];

      for (const [catKey, data] of discoveredCategoryData.entries()) {
        const existing = categoryMap.get(catKey);
        const fk = Array.from(data.keywords);
        const payload: any = {
          category: catKey,
          display_name: data.display_name || catKey,
          filter_keywords: fk,
          is_published: true,
          display_order: existing ? existing.display_order : nextOrder++,
          icon_url: data.icon_url || existing?.icon_url || null,
          updated_at: new Date().toISOString(),
        };

        if (existing && existing.id) {
          // Update existing - ต้องมี id
          payload.id = existing.id;
          toUpdate.push(payload);
        } else {
          // Insert new - ไม่ส่ง id (ให้ database generate)
          toInsert.push(payload);
        }
      }

      // Update existing categories
      if (toUpdate.length > 0) {
        for (const updatePayload of toUpdate) {
          const { error: updateErr } = await sb
            .from('app_premium_categories')
            .update(updatePayload)
            .eq('id', updatePayload.id);
          
          if (!updateErr) {
            categoriesUpserted += 1;
          } else {
            console.error('App premium category update error', updateErr);
          }
        }
      }

      // Insert new categories
      if (toInsert.length > 0) {
        const { error: insertErr } = await sb
          .from('app_premium_categories')
          .insert(toInsert);

        if (!insertErr) {
          categoriesUpserted += toInsert.length;
        } else {
          console.error('App premium categories insert error', insertErr);
        }
      }
    }

    return NextResponse.json({ ok: true, counts: { products: upserted, categories: categoriesUpserted } });
  } catch (error) {
    console.error('App premium sync error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // เรียก internal function แทน external fetch
  return await performSync();
}

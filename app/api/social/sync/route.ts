import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createServiceClient } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-keys';

type ProviderService = {
  service: string;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  desc?: string;
  dripfeed?: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .substring(0, 100);
}

function parseNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  // Handle comma-separated numbers like "1,032.26"
  const cleaned = String(value).replace(/,/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

// เพิ่ม maxDuration เพื่อรองรับ request ที่ใช้เวลานาน
export const maxDuration = 300; // 5 นาที (300 วินาที)
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.WEBHOOK_SECRET;
  const isWebhook = secret && authHeader === `Bearer ${secret}`;
  
  // ถ้าไม่ใช่ webhook ต้องเป็น admin
  if (!isWebhook) {
    const { getAuthUser } = await import('@/lib/auth');
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    
    const sb = createServiceClient();
    const { data: userData } = await sb
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const sb = createServiceClient();
  
  // ดึง provider_id จาก request body หรือใช้ default
  let providerId: number | null = null;
  try {
    // ตรวจสอบว่ามี body หรือไม่
    const contentType = req.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const body = await req.json();
      providerId = body.provider_id ? parseInt(String(body.provider_id)) : null;
    }
  } catch {
    // ถ้าไม่มี body หรือ parse ไม่ได้ ให้ใช้ default
  }

  // ดึง provider จาก database
  let provider;
  if (providerId) {
    const { data: providerData, error: providerError } = await sb
      .from('social_providers')
      .select('*')
      .eq('id', providerId)
      .eq('is_active', true)
      .single();
    
    if (providerError || !providerData) {
      return NextResponse.json({ error: 'provider_not_found', detail: 'ไม่พบ provider หรือ provider ถูกปิดใช้งาน' }, { status: 404 });
    }
    provider = providerData;
  } else {
    // ใช้ provider แรกที่ active
    const { data: firstProvider, error: firstError } = await sb
      .from('social_providers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (firstError || !firstProvider) {
      return NextResponse.json({ error: 'no_active_provider', detail: 'ไม่พบ provider ที่เปิดใช้งาน' }, { status: 500 });
    }
    provider = firstProvider;
  }

  const apiKey = await getApiKey(provider.api_key_name);
  if (!apiKey) {
    return NextResponse.json({ error: 'missing_api_key', detail: `ไม่พบ API key สำหรับ ${provider.name}` }, { status: 500 });
  }

  const API_URL = provider.api_url;

  try {
    // API ใหม่ส่งราคาเป็น THB มาให้แล้ว แต่เรายังต้องใช้ exchange_rate 
    // สำหรับแปลง THB กลับเป็น USD เพื่อเก็บใน rate_usd (หรืออาจจะไม่ใช้ก็ได้)
    // หรือสามารถลบส่วนนี้ออกได้ถ้าไม่ต้องการเก็บ rate_usd
    const { data: rateSetting } = await sb
      .from('settings')
      .select('value')
      .eq('key', 'social_exchange_rate')
      .maybeSingle();

    const fallbackRate = Number(process.env.SOCIAL_EXCHANGE_RATE || 35);
    const exchangeRateRaw = rateSetting?.value ?? fallbackRate;
    const exchangeRate = parseNumber(exchangeRateRaw);
    // ไม่จำเป็นต้อง validate exchange_rate ถ้า API ส่ง THB มาแล้ว
    // แต่เรายังใช้สำหรับแปลงกลับเป็น USD ถ้าต้องการ

    const body = new URLSearchParams({ key: apiKey, action: 'services' });
    
    // เพิ่ม timeout controller สำหรับ fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 นาที timeout สำหรับ external API
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await response.json();
    if (!Array.isArray(json)) {
      return NextResponse.json({ error: 'provider_error', detail: json?.error || json }, { status: 502 });
    }

    const services = json as ProviderService[];

    const categoriesMap = new Map<string, { id: number; slug: string }>();
    const uniqueCategories = Array.from(new Set(services.map((s) => s.category).filter(Boolean)));

    if (uniqueCategories.length) {
      const { data: existingCategories } = await sb
        .from('social_categories')
        .select('id, slug, name, display_order');

      const existingBySlug = new Map<string, { id: number; name: string }>();
      for (const cat of existingCategories || []) {
        existingBySlug.set(cat.slug, { id: cat.id, name: cat.name });
      }

      let nextDisplayOrder = Math.max(0, ...(existingCategories || []).map((cat) => Number(cat.display_order || 0))) + 1;

      for (const categoryName of uniqueCategories) {
        const slug = slugify(categoryName);
        const existing = existingBySlug.get(slug);
        if (existing) {
          categoriesMap.set(categoryName, { id: existing.id, slug });
          continue;
        }

        const { data: inserted } = await sb
          .from('social_categories')
          .insert({ name: categoryName, slug, display_order: nextDisplayOrder++ })
          .select('id, slug')
          .single();

        if (inserted) {
          categoriesMap.set(categoryName, { id: inserted.id, slug: inserted.slug });
        }
      }
    }

    const { data: existingServices } = await sb
      .from('social_services')
      .select('id, provider_id, provider_service_id, display_name, markup_percent, markup_fixed, is_published')
      .eq('provider_id', provider.id);

    // ใช้ composite key: provider_id + provider_service_id
    const existingMap = new Map<string, NonNullable<typeof existingServices>[number]>();
    for (const svc of existingServices || []) {
      const key = `${svc.provider_id}_${svc.provider_service_id}`;
      existingMap.set(key, svc);
    }

    const keepProviderIds = new Set<string>();
    let upserted = 0;

    // แบ่ง services เป็น batches สำหรับ batch upsert (เร็วขึ้นมาก)
    const BATCH_SIZE = 200; // 200 รายการต่อ batch
    const batches: ProviderService[][] = [];
    for (let i = 0; i < services.length; i += BATCH_SIZE) {
      batches.push(services.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${services.length} services in ${batches.length} batches`);

    // Process แต่ละ batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const payloads: Record<string, unknown>[] = [];

      for (const svc of batch) {
        const providerServiceId = String(svc.service);
        if (!providerServiceId) continue;
        keepProviderIds.add(providerServiceId);

        const key = `${provider.id}_${providerServiceId}`;
        const existing = existingMap.get(key);

      // API ใหม่ส่งราคาเป็นบาท (THB) มาให้แล้ว ไม่ใช่ USD
      const rateThb = parseNumber(svc.rate);
      // สำหรับเก็บ rate_usd เราแปลงกลับจาก THB เพื่อเก็บเป็น record (หรือจะเก็บเป็น null ก็ได้)
      const rateUsd = exchangeRate > 0 ? rateThb / exchangeRate : 0;
      const minQty = Math.max(0, Math.floor(parseNumber(svc.min)));
      const maxQty = Math.max(minQty, Math.floor(parseNumber(svc.max)));
      const categoryEntry = svc.category ? categoriesMap.get(svc.category) : undefined;

      const payload: Record<string, unknown> = {
          provider_id: provider.id,
          provider_service_id: providerServiceId,
        name: svc.name,
        type: svc.type,
        category_id: categoryEntry?.id ?? null,
        rate_usd: rateUsd,
        base_rate_thb: rateThb, // API ส่งมาเป็น THB แล้ว
        min_quantity: minQty,
        max_quantity: maxQty,
        refill: false, // Not available in new API
        cancel: false, // Not available in new API
        exchange_rate: exchangeRate,
        metadata: { ...svc, desc: svc.desc, dripfeed: svc.dripfeed }
      };

      if (existing) {
        payload.id = existing.id;
        payload.display_name = existing.display_name;
        payload.markup_percent = existing.markup_percent ?? 0;
        payload.markup_fixed = existing.markup_fixed ?? 0;
        payload.is_published = existing.is_published ?? false;
      } else {
        payload.display_name = svc.name;
      }

        payloads.push(payload);
      }

      // Batch upsert - เร็วกว่าการ upsert ทีละรายการมาก
      if (payloads.length > 0) {
        try {
          const { error: upsertError } = await sb
            .from('social_services')
            .upsert(payloads, { 
              onConflict: 'provider_id,provider_service_id',
              ignoreDuplicates: false
            });
          
      if (upsertError) {
            console.error(`Batch ${batchIndex + 1}/${batches.length} upsert error:`, upsertError);
            // Continue with next batch even if this one fails
          } else {
            upserted += payloads.length;
            console.log(`Batch ${batchIndex + 1}/${batches.length} completed: ${payloads.length} services`);
    }
        } catch (batchError) {
          console.error(`Batch ${batchIndex + 1}/${batches.length} error:`, batchError);
          // Continue with next batch
        }
      }
    }

    // อัพเดท services ที่หายไปจาก provider นี้ให้เป็น unpublished
    if (existingServices?.length) {
      const missing = existingServices
        .filter((svc) => !keepProviderIds.has(String(svc.provider_service_id)))
        .map((svc) => svc.id);
      if (missing.length) {
        await sb
          .from('social_services')
          .update({ is_published: false })
          .in('id', missing);
      }
    }
    return NextResponse.json({ 
      ok: true, 
      counts: { services: upserted, categories: categoriesMap.size }, 
      exchangeRate,
      provider: { id: provider.id, name: provider.name }
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Social sync timeout:', error);
      return NextResponse.json({ 
        error: 'timeout', 
        detail: 'Request timeout - การดึงข้อมูลจาก provider ใช้เวลานานเกินไป กรุณาลองใหม่' 
      }, { status: 504 });
    }
    console.error('Social sync error:', error);
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ' 
    }, { status: 500 });
  }
}

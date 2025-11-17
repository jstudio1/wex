import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createServiceClient } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-keys';

const API_URL = 'https://socialtools24hr.com/api/v1';

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

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = await getApiKey('SOCIAL_API_KEY');
  if (!apiKey) {
    return NextResponse.json({ error: 'missing_social_api_key' }, { status: 500 });
  }

  const sb = createServiceClient();

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
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

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
        .select('id, slug, name');

      const existingBySlug = new Map<string, { id: number; name: string }>();
      for (const cat of existingCategories || []) {
        existingBySlug.set(cat.slug, { id: cat.id, name: cat.name });
      }

      for (const categoryName of uniqueCategories) {
        const slug = slugify(categoryName);
        const existing = existingBySlug.get(slug);
        if (existing) {
          categoriesMap.set(categoryName, { id: existing.id, slug });
          continue;
        }

        const { data: inserted } = await sb
          .from('social_categories')
          .insert({ name: categoryName, slug })
          .select('id, slug')
          .single();

        if (inserted) {
          categoriesMap.set(categoryName, { id: inserted.id, slug: inserted.slug });
        }
      }
    }

    const { data: existingServices } = await sb
      .from('social_services')
      .select('id, provider_service_id, display_name, markup_percent, markup_fixed, is_published');

    const existingMap = new Map<string, NonNullable<typeof existingServices>[number]>();
    for (const svc of existingServices || []) {
      existingMap.set(String(svc.provider_service_id), svc);
    }

    const keepProviderIds = new Set<string>();
    let upserted = 0;

    for (const svc of services) {
      const providerId = String(svc.service);
      if (!providerId) continue;
      keepProviderIds.add(providerId);

      const existing = existingMap.get(providerId);

      // API ใหม่ส่งราคาเป็นบาท (THB) มาให้แล้ว ไม่ใช่ USD
      const rateThb = parseNumber(svc.rate);
      // สำหรับเก็บ rate_usd เราแปลงกลับจาก THB เพื่อเก็บเป็น record (หรือจะเก็บเป็น null ก็ได้)
      const rateUsd = exchangeRate > 0 ? rateThb / exchangeRate : 0;
      const minQty = Math.max(0, Math.floor(parseNumber(svc.min)));
      const maxQty = Math.max(minQty, Math.floor(parseNumber(svc.max)));
      const categoryEntry = svc.category ? categoriesMap.get(svc.category) : undefined;

      const payload: Record<string, unknown> = {
        provider_service_id: providerId,
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

      const { error: upsertError } = await sb.from('social_services').upsert(payload, { onConflict: 'provider_service_id' });
      if (upsertError) {
        console.error('Social service upsert error', upsertError);
        continue;
      }
      upserted += 1;
    }

    if (existingServices?.length) {
      const missing = existingServices
        .map((svc) => String(svc.provider_service_id))
        .filter((id) => !keepProviderIds.has(id));
      if (missing.length) {
        await sb
          .from('social_services')
          .update({ is_published: false })
          .in('provider_service_id', missing);
      }
    }

    try { revalidateTag('social-services'); revalidateTag('social-categories'); } catch {}
    return NextResponse.json({ ok: true, counts: { services: upserted, categories: categoriesMap.size }, exchangeRate });
  } catch (error) {
    console.error('Social sync error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


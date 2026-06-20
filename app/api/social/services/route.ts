import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';

export const revalidate = 120;

const PAGE_SIZE = 1000;
const SERVICE_FIELDS =
  'id, provider_service_id, name, display_name, category_id, base_rate_thb, min_quantity, max_quantity, is_published, markup_percent, markup_fixed';

export async function GET() {
  const sb = createServiceClient();

  try {
    const { pct: globalPct, fix: globalFix } = await getGlobalMarkup();

    const services = await fetchAllServices(sb);
    if ('error' in services) {
      return NextResponse.json({ error: 'db_error', detail: services.error }, { status: 500 });
    }

    const servicePayload = services.map((svc) => {
      const pricePerThousand = computePrice(
        Number(svc.base_rate_thb || 0),
        Number(svc.markup_percent || 0),
        Number(svc.markup_fixed || 0),
        globalPct,
        globalFix
      );
      // ตัดความยาวชื่อให้ <=120 ตัวอักษร เพื่อให้ payload เข้าได้ใน Next.js data cache (2MB)
      // ผู้ให้บริการบางเจ้าส่งชื่อยาวเป็นย่อหน้าเต็มมา
      const truncate = (s: string | null | undefined, max = 120) =>
        s && s.length > max ? s.slice(0, max - 1) + '…' : s || '';
      const display = truncate(svc.display_name || svc.name);
      const rawName = truncate(svc.name);
      const payload: any = {
        id: svc.id,
        provider_service_id: svc.provider_service_id,
        ...(rawName && rawName !== display ? { name: rawName } : {}),
        display_name: display,
        category_id: svc.category_id,
        price_per_1000: pricePerThousand,
        base_rate_thb: Number(svc.base_rate_thb || 0),
        min_quantity: svc.min_quantity,
        max_quantity: svc.max_quantity,
        markup_percent: Number(svc.markup_percent || 0),
        markup_fixed: Number(svc.markup_fixed || 0),
      };
      return payload;
    });

    const categoryIds = Array.from(new Set(servicePayload.map((svc) => svc.category_id).filter(Boolean))) as number[];
    let categories: { id: number; name: string; slug: string; display_order?: number }[] = [];
    if (categoryIds.length) {
      const { data: catData } = await sb
        .from('social_categories')
        .select('id, name, slug, display_order')
        .eq('is_published', true)
        .in('id', categoryIds)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      categories = catData || [];
    }

    return NextResponse.json(
      { data: { services: servicePayload, categories, globalMarkup: { percent: globalPct, fixed: globalFix } } },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
        },
      }
    );
  } catch (error) {
    console.error('social services error', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

async function fetchAllServices(sb: ReturnType<typeof createServiceClient>) {
  let offset = 0;
  const results: Array<{
    id: number;
    provider_service_id: number;
    name: string;
    display_name: string | null;
    category_id: number | null;
    base_rate_thb: number | null;
    min_quantity: number;
    max_quantity: number;
    is_published: boolean;
    markup_percent: number | null;
    markup_fixed: number | null;
  }> = [];

  while (true) {
    const { data, error } = await sb
      .from('social_services')
      .select(SERVICE_FIELDS)
      .eq('is_published', true)
      .order('name')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return { error: error.message };
    }

    if (data?.length) {
      results.push(...data);
    }

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return results;
}

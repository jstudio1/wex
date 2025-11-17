import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = createServiceClient();

  try {
    const { pct: globalPct, fix: globalFix } = await getGlobalMarkup();

    const { data: services, error } = await sb
      .from('social_services')
      .select('id, provider_service_id, name, display_name, category_id, rate_usd, base_rate_thb, min_quantity, max_quantity, refill, cancel, is_published, markup_percent, markup_fixed')
      .eq('is_published', true)
      .order('name');

    if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });

    const servicePayload = (services || []).map((svc) => {
      const pricePerThousand = computePrice(
        Number(svc.base_rate_thb || 0),
        Number(svc.markup_percent || 0),
        Number(svc.markup_fixed || 0),
        globalPct,
        globalFix
      );
      return {
        id: svc.id,
        provider_service_id: svc.provider_service_id,
        name: svc.name,
        display_name: svc.display_name || svc.name,
        category_id: svc.category_id,
        price_per_1000: pricePerThousand,
        base_rate_thb: Number(svc.base_rate_thb || 0),
        rate_usd: Number(svc.rate_usd || 0),
        min_quantity: svc.min_quantity,
        max_quantity: svc.max_quantity,
        refill: svc.refill,
        cancel: svc.cancel,
        markup_percent: Number(svc.markup_percent || 0),
        markup_fixed: Number(svc.markup_fixed || 0)
      };
    });

    const categoryIds = Array.from(new Set(servicePayload.map((svc) => svc.category_id).filter(Boolean))) as number[];
    let categories: { id: number; name: string; slug: string }[] = [];
    if (categoryIds.length) {
      const { data: catData } = await sb
        .from('social_categories')
        .select('id, name, slug')
        .eq('is_published', true)
        .in('id', categoryIds)
        .order('name');
      categories = catData || [];
    }

    return NextResponse.json(
      { data: { services: servicePayload, categories, globalMarkup: { percent: globalPct, fixed: globalFix } } },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240' } }
    );
  } catch (error) {
    console.error('social services error', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


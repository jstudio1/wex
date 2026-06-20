import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

const PAGE_SIZE = 1000;
const SELECT_FIELDS =
  'id, provider_id, provider_service_id, name, display_name, type, category_id, rate_usd, base_rate_thb, min_quantity, max_quantity, refill, cancel, is_published, markup_percent, markup_fixed, exchange_rate, metadata, social_categories(id, name, slug), social_providers(id, name)';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const allServices: unknown[] = [];
  let pageStart = 0;

  while (true) {
    const { data, error } = await sb
      .from('social_services')
      .select(SELECT_FIELDS)
      .order('name')
      .range(pageStart, pageStart + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    if (data && data.length > 0) {
      allServices.push(...data);
    }

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    pageStart += PAGE_SIZE;
  }

  return NextResponse.json({ data: allServices });
}


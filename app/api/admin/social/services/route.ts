import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('social_services')
    .select('id, provider_service_id, name, display_name, type, category_id, rate_usd, base_rate_thb, min_quantity, max_quantity, refill, cancel, is_published, markup_percent, markup_fixed, exchange_rate, metadata, social_categories(id, name, slug)')
    .order('name');

  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  return NextResponse.json({ data });
}


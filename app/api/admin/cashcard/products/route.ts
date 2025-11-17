import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('cashcard_products')
    .select('id, provider_product_id, category, name, display_name, base_price, recommended_price, discount, markup_percent, markup_fixed, image_url, info, format_id, is_published, created_at, updated_at')
    .order('name');

  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  return NextResponse.json({ data });
}


import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') || 'all';
  const productType = searchParams.get('product_type');

  const sb = createServiceClient();
  
  let query = sb.from('products').select('*');
  
  if (filter === 'published') {
    query = query.eq('is_published', true);
  } else if (filter === 'unpublished') {
    query = query.eq('is_published', false);
  }

  if (productType) {
    query = query.eq('product_type', productType);
  }

  // Select all columns and map to only needed fields
  const { data: rawData, error } = await query
    .order('is_published', { ascending: false })
    .order('name');

  if (error) {
    console.error('[API] Products GET error:', error);
    return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  }

  // Map to only needed fields, with icon_url defaulting to null if not present
  const data = (rawData || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    key: p.key,
    is_published: p.is_published,
    image_url: p.image_url || null,
    banner_url: p.banner_url || null,
    icon_url: p.icon_url || null,
    badge_enabled: p.badge_enabled || false,
    badge_percent: p.badge_percent,
    badge_text: p.badge_text,
    badge_apply_price: p.badge_apply_price || false,
    is_flashsale: p.is_flashsale || false,
    flashsale_price: p.flashsale_price || null,
  }));

  return NextResponse.json({ data });
}


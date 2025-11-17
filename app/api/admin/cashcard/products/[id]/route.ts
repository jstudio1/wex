import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    return NextResponse.json({ error: 'invalid_product_id' }, { status: 400 });
  }

  try {
    const payload = await req.json();
    const update: Record<string, unknown> = {};

    if (typeof payload.display_name === 'string') update.display_name = payload.display_name;
    if (typeof payload.markup_percent === 'number') update.markup_percent = payload.markup_percent;
    if (typeof payload.markup_fixed === 'number') update.markup_fixed = payload.markup_fixed;
    if (typeof payload.is_published === 'boolean') update.is_published = payload.is_published;

    if (!Object.keys(update).length) {
      return NextResponse.json({ error: 'empty_payload' }, { status: 400 });
    }

    update.updated_at = new Date().toISOString();

    const sb = createServiceClient();
    const { error } = await sb
      .from('cashcard_products')
      .update(update)
      .eq('id', productId);

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Update cashcard product error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


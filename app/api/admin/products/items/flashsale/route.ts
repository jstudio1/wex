import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'invalid_items', detail: 'items must be an array' }, { status: 400 });
    }

    const sb = createServiceClient();

    for (const item of items) {
      if (!item.id || typeof item.id !== 'number') {
        continue;
      }

      const updateData: any = {
        is_flashsale: Boolean(item.is_flashsale),
      };

      if (item.flashsale_price !== undefined) {
        updateData.flashsale_price = item.flashsale_price !== null && item.flashsale_price !== '' 
          ? Number(item.flashsale_price) 
          : null;
      }

      if (item.flashsale_max_quantity !== undefined) {
        updateData.flashsale_max_quantity = item.flashsale_max_quantity !== null && item.flashsale_max_quantity !== '' 
          ? parseInt(item.flashsale_max_quantity) 
          : null;
      }

      if (item.flashsale_duration_days !== undefined) {
        updateData.flashsale_duration_days = item.flashsale_duration_days !== null && item.flashsale_duration_days !== '' 
          ? parseInt(item.flashsale_duration_days) 
          : null;
      }

      if (item.flashsale_start_date !== undefined) {
        updateData.flashsale_start_date = item.flashsale_start_date || null;
      }

      const { error } = await sb
        .from('product_items')
        .update(updateData)
        .eq('id', item.id);

      if (error) {
        console.error(`[API] Error updating item ${item.id}:`, error);
        // Continue with other items instead of failing completely
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API] Flash sale items update error:', error);
    return NextResponse.json({ error: 'unexpected', detail: (error as Error).message }, { status: 500 });
  }
}


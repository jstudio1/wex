import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const itemSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  order_index: z.number().int().min(0).optional(),
});

export async function GET() {
  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('privacy_policy_items')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('[Privacy Items GET] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[Privacy Items GET] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = itemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // หา order_index สูงสุด
    const sb = createServiceClient();
    const { data: maxOrder } = await sb
      .from('privacy_policy_items')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    const orderIndex = parsed.data.order_index ?? ((maxOrder?.order_index ?? -1) + 1);

    const { data, error } = await sb
      .from('privacy_policy_items')
      .insert({
        title: parsed.data.title,
        content: parsed.data.content,
        order_index: orderIndex,
      })
      .select()
      .single();

    if (error) {
      console.error('[Privacy Items POST] Error:', error);
      return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[Privacy Items POST] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


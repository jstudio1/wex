import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  order_index: z.number().int().min(0).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('privacy_policy_items')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[Privacy Item GET] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[Privacy Item GET] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = updateItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const sb = createServiceClient();
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.content !== undefined) updateData.content = parsed.data.content;
    if (parsed.data.order_index !== undefined) updateData.order_index = parsed.data.order_index;

    const { data, error } = await sb
      .from('privacy_policy_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Privacy Item PUT] Error:', error);
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[Privacy Item PUT] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const sb = createServiceClient();
    const { error } = await sb.from('privacy_policy_items').delete().eq('id', id);

    if (error) {
      console.error('[Privacy Item DELETE] Error:', error);
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Privacy Item DELETE] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


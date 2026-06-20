import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const prizeUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['points', 'coupon', 'other']).optional(),
  value: z.string().min(1).optional(),
  probability: z.number().positive().max(100).optional(),
  quantity: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().optional(),
  image_url: z.string().url().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; prize_id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id, prize_id } = await params;
    const gameId = parseInt(id);
    const prizeId = parseInt(prize_id);
    
    if (isNaN(gameId) || isNaN(prizeId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = prizeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', detail: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    const sb = createServiceClient();

    // ตรวจสอบว่า prize มีอยู่จริงและเป็นของ game นี้
    const { data: existingPrize } = await sb
      .from('game_prizes')
      .select('*')
      .eq('id', prizeId)
      .eq('game_id', gameId)
      .single();

    if (!existingPrize) {
      return NextResponse.json({ error: 'prize_not_found' }, { status: 404 });
    }

    // ถ้ามีการแก้ไข probability ให้ตรวจสอบใหม่
    if (data.probability !== undefined) {
      const { data: otherPrizes } = await sb
        .from('game_prizes')
        .select('probability')
        .eq('game_id', gameId)
        .eq('is_active', true)
        .neq('id', prizeId);

      const totalProbability = (otherPrizes || []).reduce((sum, p) => sum + Number(p.probability), 0) + data.probability;
      if (totalProbability > 100) {
        return NextResponse.json({ error: 'probability_exceeds_100' }, { status: 400 });
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.probability !== undefined) updateData.probability = data.probability;
    if (data.quantity !== undefined) {
      updateData.quantity = data.quantity;
      // อัพเดท remaining_quantity ถ้า quantity เปลี่ยน
      if (data.quantity !== null && data.quantity < Number(existingPrize.remaining_quantity || 0)) {
        updateData.remaining_quantity = data.quantity;
      } else if (data.quantity !== null && existingPrize.remaining_quantity === null) {
        updateData.remaining_quantity = data.quantity;
      }
    }
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.display_order !== undefined) updateData.display_order = data.display_order;
    if (data.image_url !== undefined) updateData.image_url = data.image_url;
    if (data.description !== undefined) updateData.description = data.description;

    const { data: updatedPrize, error } = await sb
      .from('game_prizes')
      .update(updateData)
      .eq('id', prizeId)
      .eq('game_id', gameId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: updatedPrize });
  } catch (err) {
    console.error('Prize PUT error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; prize_id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id, prize_id } = await params;
    const gameId = parseInt(id);
    const prizeId = parseInt(prize_id);
    
    if (isNaN(gameId) || isNaN(prizeId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const sb = createServiceClient();
    const { error } = await sb
      .from('game_prizes')
      .delete()
      .eq('id', prizeId)
      .eq('game_id', gameId);

    if (error) {
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Prize DELETE error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}








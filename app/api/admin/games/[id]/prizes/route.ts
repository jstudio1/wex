import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const prizeSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['points', 'coupon', 'other']),
  value: z.string().min(1),
  probability: z.number().positive().max(100),
  quantity: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().optional(),
  image_url: z.string().url().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const gameId = parseInt(params.id);
  if (isNaN(gameId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('game_prizes')
    .select('*')
    .eq('game_id', gameId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const gameId = parseInt(params.id);
    if (isNaN(gameId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    // ตรวจสอบว่าเกมมีอยู่จริง
    const sb = createServiceClient();
    const { data: game } = await sb
      .from('game_games')
      .select('id')
      .eq('id', gameId)
      .single();

    if (!game) {
      return NextResponse.json({ error: 'game_not_found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = prizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', detail: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;

    // ตรวจสอบว่า probability รวมกันไม่เกิน 100%
    const { data: existingPrizes } = await sb
      .from('game_prizes')
      .select('probability')
      .eq('game_id', gameId)
      .eq('is_active', true);

    const totalProbability = (existingPrizes || []).reduce((sum, p) => sum + Number(p.probability), 0) + data.probability;
    if (totalProbability > 100) {
      return NextResponse.json({ error: 'probability_exceeds_100' }, { status: 400 });
    }

    const { data: newPrize, error } = await sb
      .from('game_prizes')
      .insert({
        game_id: gameId,
        name: data.name,
        type: data.type,
        value: data.value,
        probability: data.probability,
        quantity: data.quantity || null,
        remaining_quantity: data.quantity || null,
        is_active: data.is_active ?? true,
        display_order: data.display_order || 0,
        image_url: data.image_url || null,
        description: data.description || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: newPrize });
  } catch (err) {
    console.error('Prize POST error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}








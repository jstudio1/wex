import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const gameSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['spin_wheel', 'loot_box']),
  cost_points: z.number().positive(),
  is_active: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  settings: z.record(z.string(), z.any()).optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('game_games')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = gameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', detail: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    const sb = createServiceClient();

    const { data: newGame, error } = await sb
      .from('game_games')
      .insert({
        name: data.name,
        type: data.type,
        cost_points: data.cost_points,
        is_active: data.is_active ?? true,
        description: data.description || null,
        image_url: data.image_url || null,
        settings: data.settings || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: newGame });
  } catch (err) {
    console.error('Game POST error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


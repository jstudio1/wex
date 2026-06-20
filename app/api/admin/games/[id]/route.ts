import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const gameUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['spin_wheel', 'loot_box']).optional(),
  cost_points: z.number().positive().optional(),
  is_active: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  settings: z.record(z.string(), z.any()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const numericId = parseInt(id);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('game_games')
    .select('*')
    .eq('id', numericId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = gameUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', detail: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    const sb = createServiceClient();

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.cost_points !== undefined) updateData.cost_points = data.cost_points;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.image_url !== undefined) updateData.image_url = data.image_url;
    if (data.settings !== undefined) updateData.settings = data.settings;

    const { data: updatedGame, error } = await sb
      .from('game_games')
      .update(updateData)
      .eq('id', numericId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: updatedGame });
  } catch (err) {
    console.error('Game PUT error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const sb = createServiceClient();
    const { error } = await sb
      .from('game_games')
      .delete()
      .eq('id', numericId);

    if (error) {
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Game DELETE error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const updateGameAccountSchema = z.object({
  game_name: z.string().min(1).optional(),
  game_category_id: z.number().optional().nullable(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  cover_image_url: z.string().optional().nullable(),
  additional_images: z.array(z.string()).optional(),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  original_price: z.number().min(0).optional().nullable(),
  discount_percent: z.number().int().min(0).max(100).optional().nullable(),
  stock: z.number().int().min(0).optional(),
  is_published: z.boolean().optional()
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('game_accounts')
      .select('*, game_categories(id, name, slug)')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error('Game account GET error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const body = await req.json();
    const validated = updateGameAccountSchema.parse(body);

    const sb = createServiceClient();
    
    // Prepare update data - only include fields that are provided
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (validated.game_name !== undefined) updateData.game_name = validated.game_name;
    if (validated.game_category_id !== undefined) updateData.game_category_id = validated.game_category_id;
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.cover_image_url !== undefined) updateData.cover_image_url = validated.cover_image_url;
    if (validated.additional_images !== undefined) updateData.additional_images = validated.additional_images;
    if (validated.username !== undefined) updateData.username = validated.username;
    if (validated.password !== undefined) updateData.password = validated.password;
    if (validated.price !== undefined) updateData.price = validated.price;
    if (validated.original_price !== undefined) updateData.original_price = validated.original_price;
    if (validated.discount_percent !== undefined) updateData.discount_percent = validated.discount_percent;
    if (validated.stock !== undefined) updateData.stock = validated.stock;
    if (validated.is_published !== undefined) updateData.is_published = validated.is_published;
    
    const { data, error } = await sb
      .from('game_accounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('Game account PUT error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const sb = createServiceClient();
    const { error } = await sb
      .from('game_accounts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Game account DELETE error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


import type { NextRequest } from 'next/server';
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
  banner_image_url: z.string().url().optional().nullable(),
  additional_images: z.array(z.string()).optional(),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  original_price: z.number().min(0).optional().nullable(),
  discount_percent: z.number().int().min(0).max(100).optional().nullable(),
  permission_id: z.union([
    z.number().int().positive(),
    z.null(),
    z.literal(''),
  ]).optional().transform((val) => val === '' ? null : val),
  stock: z.number().int().min(0).optional(),
  is_published: z.boolean().optional()
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const permissionId = searchParams.get('permission_id');

    const sb = createServiceClient();
    let query = sb
      .from('game_accounts')
      .select('*, game_categories(id, name, slug)')
      .eq('id', numericId)
      .eq('is_published', true);

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    // ถ้ามี permission_id ให้ดึงราคาสำหรับ permission นี้
    if (permissionId) {
      const permId = parseInt(permissionId);
      if (!isNaN(permId)) {
        const { data: customPrice } = await sb
          .from('game_account_prices')
          .select('price')
          .eq('game_account_id', id)
          .eq('permission_id', permId)
          .maybeSingle();
        
        if (customPrice) {
          return NextResponse.json({ 
            ok: true, 
            data: { price: Number(customPrice.price) } 
          });
        }
      }
      return NextResponse.json({ ok: true, data: null });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error('Game account GET error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
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
    if (validated.banner_image_url !== undefined) updateData.banner_image_url = validated.banner_image_url;
    if (validated.additional_images !== undefined) updateData.additional_images = validated.additional_images;
    if (validated.username !== undefined) updateData.username = validated.username;
    if (validated.password !== undefined) updateData.password = validated.password;
    if (validated.price !== undefined) updateData.price = validated.price;
    if (validated.original_price !== undefined) updateData.original_price = validated.original_price;
    if (validated.discount_percent !== undefined) updateData.discount_percent = validated.discount_percent;
    if (validated.permission_id !== undefined) updateData.permission_id = validated.permission_id;
    if (validated.stock !== undefined) updateData.stock = validated.stock;
    if (validated.is_published !== undefined) updateData.is_published = validated.is_published;
    
    const { data, error } = await sb
      .from('game_accounts')
      .update(updateData)
      .eq('id', numericId)
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
      .from('game_accounts')
      .delete()
      .eq('id', numericId);

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Game account DELETE error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const updateItemSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  is_recommended: z.boolean().optional(),
  price: z.number().optional(),
  original_price: z.number().optional().nullable(),
  public_price: z.number().optional().nullable(),
  agent_discount_percent: z.number().optional(),
  agent_cost_price: z.number().optional(),
  markup_percent: z.number().optional(),
  markup_fixed: z.number().optional(),
  icon_url: z.string().nullable().optional(),
});

const updateItemsSchema = z.object({
  items: z.array(updateItemSchema).min(1),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const sb = createServiceClient();

    // Get product
    const { data: product, error: productError } = await sb
      .from('products')
      .select('id, name, key')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'product_not_found' }, { status: 404 });
    }

    // Get items with recommended flag
    const { data: items, error: itemsError } = await sb
      .from('product_items')
      .select('id, name, sku, price, original_price, public_price, agent_discount_percent, agent_cost_price, markup_percent, markup_fixed, is_recommended, icon_url')
      .eq('product_id', productId)
      .order('price', { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: 'db_error', detail: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          key: product.key,
        },
        items: items || [],
      },
    });
  } catch (err) {
    console.error('Pricing GET error:', err);
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
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const body = await req.json();
    const validated = updateItemsSchema.parse(body);

    const sb = createServiceClient();

    // Verify product exists
    const { data: product } = await sb
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'product_not_found' }, { status: 404 });
    }

    // Update each item
    const updatePromises = validated.items.map(async (itemUpdate) => {
      const updateData: any = {};

      if (itemUpdate.is_recommended !== undefined) {
        updateData.is_recommended = itemUpdate.is_recommended;
      }
      if (itemUpdate.price !== undefined) {
        updateData.price = itemUpdate.price;
      }
      if (itemUpdate.original_price !== undefined) {
        updateData.original_price = itemUpdate.original_price;
        updateData.public_price = itemUpdate.original_price;
      }
      if (itemUpdate.public_price !== undefined) {
        updateData.public_price = itemUpdate.public_price;
      }
      if (itemUpdate.agent_cost_price !== undefined) {
        updateData.agent_cost_price = itemUpdate.agent_cost_price;
      }
      if (itemUpdate.agent_discount_percent !== undefined) {
        updateData.agent_discount_percent = itemUpdate.agent_discount_percent;
      }
      if (itemUpdate.name !== undefined) {
        updateData.name = itemUpdate.name;
      }
      if (itemUpdate.sku !== undefined) {
        updateData.sku = itemUpdate.sku;
      }
      if (itemUpdate.markup_percent !== undefined) {
        updateData.markup_percent = itemUpdate.markup_percent;
      }
      if (itemUpdate.markup_fixed !== undefined) {
        updateData.markup_fixed = itemUpdate.markup_fixed;
      }
      if (itemUpdate.icon_url !== undefined) {
        updateData.icon_url = itemUpdate.icon_url;
      }

      const { data, error } = await sb
        .from('product_items')
        .update(updateData)
        .eq('id', itemUpdate.id)
        .eq('product_id', productId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update item ${itemUpdate.id}: ${error.message}`);
      }

      return data;
    });

    const updatedItems = await Promise.all(updatePromises);
    
    return NextResponse.json({
      ok: true,
      data: { items: updatedItems },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('Pricing PUT error:', err);
    return NextResponse.json({ error: 'internal_error', detail: (err as Error).message }, { status: 500 });
  }
}


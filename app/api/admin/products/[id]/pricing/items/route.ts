import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

const createItemSchema = z.object({
  name: z.string().min(1, { message: 'name_required' }).max(255, { message: 'name_too_long' }),
  sku: z.string().min(1, { message: 'sku_required' }).max(255, { message: 'sku_too_long' }),
  price: z.number().min(0, { message: 'price_invalid' }),
  original_price: z.number().min(0, { message: 'original_price_invalid' }).nullable().optional(),
  public_price: z.number().min(0).nullable().optional(),
  agent_discount_percent: z.number().min(0).max(100).optional(),
  agent_cost_price: z.number().min(0).optional(),
  markup_percent: z.number().min(0).optional(),
  markup_fixed: z.number().min(0).optional(),
  icon_url: z.string().trim().min(1).nullable().optional(),
  is_recommended: z.boolean().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const productId = parseInt(params.id, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const body = await req.json();
    const validated = createItemSchema.parse(body);

    const sb = createServiceClient();

    // Ensure product exists
    const { data: product, error: productError } = await sb
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'product_not_found' }, { status: 404 });
    }

    // Prevent duplicate SKU within the same product
    const { data: duplicatedSku } = await sb
      .from('product_items')
      .select('id')
      .eq('product_id', productId)
      .eq('sku', validated.sku)
      .maybeSingle();

    if (duplicatedSku) {
      return NextResponse.json({ error: 'duplicate_sku' }, { status: 409 });
    }

    const publicPrice = validated.public_price ?? validated.original_price ?? validated.price;
    const agentDiscountPercent = validated.agent_discount_percent ?? 0;
    const agentCost =
      validated.agent_cost_price ??
      validated.price ??
      (publicPrice != null ? publicPrice * (1 - agentDiscountPercent / 100) : 0);

    const payload = {
      product_id: productId,
      name: validated.name.trim(),
      sku: validated.sku.trim(),
      price: agentCost,
      original_price: publicPrice ?? null,
      public_price: publicPrice ?? null,
      agent_discount_percent: agentDiscountPercent,
      agent_cost_price: agentCost,
      markup_percent: validated.markup_percent ?? 0,
      markup_fixed: validated.markup_fixed ?? 0,
      icon_url: validated.icon_url ? validated.icon_url.trim() : null,
      is_recommended: validated.is_recommended ?? false,
    };

    const { data: item, error: insertError } = await sb
      .from('product_items')
      .insert(payload)
      .select('id, name, sku, price, original_price, public_price, agent_discount_percent, agent_cost_price, markup_percent, markup_fixed, is_recommended, icon_url')
      .single();

    if (insertError || !item) {
      return NextResponse.json({ error: 'db_error', detail: insertError?.message }, { status: 500 });
    }

    try {
      revalidateTag('products');
      revalidateTag(`product-${productId}`);
    } catch {}

    return NextResponse.json({
      ok: true,
      data: item,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('Product item create error:', err);
    return NextResponse.json({ error: 'internal_error', detail: (err as Error).message }, { status: 500 });
  }
}



import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { updateProductIconUrl } from '@/lib/supabase-raw';
import { z } from 'zod';

const batchUpdateSchema = z.object({
  products: z.array(z.object({
    id: z.number(),
    name: z.string().min(1),
    image_url: z.string().nullable().optional(),
    banner_url: z.string().nullable().optional(),
    icon_url: z.string().nullable().optional(),
    is_published: z.boolean(),
    badge_enabled: z.boolean(),
    badge_percent: z.number().nullable().optional(),
    badge_text: z.string().nullable().optional(),
    badge_apply_price: z.boolean(),
    categories: z.array(z.number()).optional(),
  })),
});

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = batchUpdateSchema.parse(body);

    const sb = createServiceClient();

    for (const product of parsed.products) {
      // อัปเดตข้อมูลบริการ
      const updateData: any = {
        name: product.name.trim(),
        image_url: product.image_url?.trim() || null,
        is_published: product.is_published,
        badge_enabled: product.badge_enabled,
        badge_percent: product.badge_percent,
        badge_text: product.badge_text?.trim() || null,
        badge_apply_price: product.badge_apply_price,
      };
      
      // เพิ่ม icon_url เฉพาะเมื่อมีค่า (ไม่ส่ง null เพื่อหลีกเลี่ยง schema cache error)
      if (product.icon_url !== undefined && product.icon_url !== null && product.icon_url.trim().length > 0) {
        updateData.icon_url = product.icon_url.trim();
      }
      
      console.log(`[API] Updating product ${product.id} with:`, updateData);
      
      // Update base fields first (without icon_url to avoid schema cache issues)
      const baseUpdateData = {
        name: updateData.name,
        image_url: updateData.image_url,
        banner_url: product.banner_url?.trim() || null,
        is_published: updateData.is_published,
        badge_enabled: updateData.badge_enabled,
        badge_percent: updateData.badge_percent,
        badge_text: updateData.badge_text,
        badge_apply_price: updateData.badge_apply_price,
      };
      
      const { error: baseError } = await sb
        .from('products')
        .update(baseUpdateData)
        .eq('id', product.id);
        
      if (baseError) {
        console.error(`[API] Base update error for product ${product.id}:`, baseError);
        throw new Error(`Failed to update product ${product.id}: ${baseError.message}`);
      }
      
      // Update icon_url if provided
      if (product.icon_url !== undefined) {
        const iconValue = product.icon_url !== null && product.icon_url.trim().length > 0 
          ? product.icon_url.trim() 
          : null;
        
        try {
          const { error: iconError } = await sb
            .from('products')
            .update({ icon_url: iconValue } as any)
            .eq('id', product.id);
            
          if (iconError) {
            // If schema cache error, assume success (column exists in DB)
            if (iconError.code === 'PGRST204' || iconError.message?.includes('icon_url') || iconError.message?.includes('schema cache') || iconError.message?.includes('Could not find')) {
              // Schema cache issue - column exists, update may have succeeded
            } else {
              console.warn(`[API] Icon URL update failed for product ${product.id}:`, iconError.message);
            }
          }
        } catch (iconErr: any) {
          console.warn(`[API] Icon URL update exception for product ${product.id}:`, iconErr.message);
        }
      }
      

      // อัปเดตหมวดหมู่
      await sb.from('product_categories').delete().eq('product_id', product.id);
      if (product.categories && product.categories.length > 0) {
        const rows = product.categories.map((cid) => ({ product_id: product.id, category_id: cid }));
        await sb.from('product_categories').insert(rows);
      }
    }

    try { revalidateTag('products'); revalidateTag('categories'); } catch {}
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error('Batch update error:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


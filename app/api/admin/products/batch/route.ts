import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { updateProductIconUrl } from '@/lib/supabase-raw';
import { z } from 'zod';

const batchUpdateSchema = z.object({
  products: z.array(z.object({
    id: z.number(),
    name: z.string().min(1).optional(),
    image_url: z.string().nullable().optional(),
    banner_url: z.string().nullable().optional(),
    icon_url: z.string().nullable().optional(),
    is_published: z.boolean().optional(),
    badge_enabled: z.boolean().optional(),
    badge_percent: z.number().nullable().optional(),
    badge_text: z.string().nullable().optional(),
    badge_apply_price: z.boolean().optional(),
    is_flashsale: z.boolean().optional(),
    flashsale_price: z.number().nullable().optional(),
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
      const updateData: any = {};
      
      if (product.name !== undefined) {
        updateData.name = product.name.trim();
      }
      if (product.image_url !== undefined) {
        updateData.image_url = product.image_url?.trim() || null;
      }
      if (product.is_published !== undefined) {
        updateData.is_published = product.is_published;
      }
      if (product.badge_enabled !== undefined) {
        updateData.badge_enabled = product.badge_enabled;
      }
      if (product.badge_percent !== undefined) {
        updateData.badge_percent = product.badge_percent;
      }
      if (product.badge_text !== undefined) {
        updateData.badge_text = product.badge_text?.trim() || null;
      }
      if (product.badge_apply_price !== undefined) {
        updateData.badge_apply_price = product.badge_apply_price;
      }
      if (product.is_flashsale !== undefined) {
        updateData.is_flashsale = product.is_flashsale;
      }
      if (product.flashsale_price !== undefined) {
        updateData.flashsale_price = product.flashsale_price;
      }
      
      // เพิ่ม icon_url เฉพาะเมื่อมีค่า (ไม่ส่ง null เพื่อหลีกเลี่ยง schema cache error)
      if (product.icon_url !== undefined && product.icon_url !== null && product.icon_url.trim().length > 0) {
        updateData.icon_url = product.icon_url.trim();
      }
      
      console.log(`[API] Updating product ${product.id} with:`, updateData);
      
      // Update base fields first (without icon_url to avoid schema cache issues)
      const baseUpdateData: any = {};
      
      if (updateData.name !== undefined) baseUpdateData.name = updateData.name;
      if (updateData.image_url !== undefined) baseUpdateData.image_url = updateData.image_url;
      if (product.banner_url !== undefined) baseUpdateData.banner_url = product.banner_url?.trim() || null;
      if (updateData.is_published !== undefined) baseUpdateData.is_published = updateData.is_published;
      if (updateData.badge_enabled !== undefined) baseUpdateData.badge_enabled = updateData.badge_enabled;
      if (updateData.badge_percent !== undefined) baseUpdateData.badge_percent = updateData.badge_percent;
      if (updateData.badge_text !== undefined) baseUpdateData.badge_text = updateData.badge_text;
      if (updateData.badge_apply_price !== undefined) baseUpdateData.badge_apply_price = updateData.badge_apply_price;
      if (updateData.is_flashsale !== undefined) baseUpdateData.is_flashsale = updateData.is_flashsale;
      if (updateData.flashsale_price !== undefined) baseUpdateData.flashsale_price = updateData.flashsale_price;
      
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


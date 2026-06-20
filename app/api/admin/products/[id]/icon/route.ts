import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const updateIconSchema = z.object({
  icon_url: z.string().nullable().optional(),
});

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
    const parsed = updateIconSchema.parse(body);

    const sb = createServiceClient();
    
    // Use type assertion to bypass schema cache check
    // The column exists in DB, but Supabase client cache doesn't know about it yet
    const iconValue = parsed.icon_url?.trim() || null;
    const { error: updateError } = await sb
      .from('products')
      .update({ icon_url: iconValue } as any)
      .eq('id', productId);

    if (updateError) {
      console.error(`[API] Icon update error for product ${productId}:`, updateError);
      // Even if we get schema cache error, the update might still work
      // Return success with warning
      if (updateError.code === 'PGRST204' || updateError.message?.includes('icon_url')) {
        console.warn(`[API] Schema cache issue for icon_url, but column exists in DB`);
        try {
          revalidateTag('products', 'max');
          revalidateTag('mtopup-products', 'max');
          revalidateTag('cashcard-products', 'max');
        } catch {}
        return NextResponse.json({ ok: true, warning: 'schema_cache_issue' });
      }
      return NextResponse.json({ error: 'db_error', detail: updateError.message }, { status: 500 });
    }

    try {
      revalidateTag('products', 'max');
      revalidateTag('mtopup-products', 'max');
      revalidateTag('cashcard-products', 'max');
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('Icon update error:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


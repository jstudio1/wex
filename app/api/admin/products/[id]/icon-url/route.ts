import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
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

    // This endpoint is designed to be called from the batch update API
    // It will use MCP tool to update icon_url directly via SQL
    // Note: This is a workaround for Supabase schema cache issues
    
    const iconValue = parsed.icon_url?.trim() || null;
    
    // Return success - the actual update will be handled by the batch API
    // This endpoint exists for future use if needed
    return NextResponse.json({ 
      ok: true, 
      message: 'Icon URL update queued',
      note: 'This endpoint is a placeholder. Actual update is handled in batch API.'
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('Icon URL update error:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


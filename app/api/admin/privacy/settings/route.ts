import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const settingsSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
});

export async function GET() {
  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('privacy_policy_settings')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[Privacy Settings GET] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return NextResponse.json({
      title: data?.title || 'นโยบายความเป็นส่วนตัว',
      description: data?.description || null,
    });
  } catch (err) {
    console.error('[Privacy Settings GET] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('privacy_policy_settings')
      .upsert(
        {
          title: parsed.data.title,
          description: parsed.data.description || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[Privacy Settings PUT] Error:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[Privacy Settings PUT] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


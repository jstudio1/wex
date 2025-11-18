import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('popup_notifications')
      .select('id, image_url, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[GET /api/admin/popup] Database error:', error);
      return NextResponse.json({ image_url: null, created_at: null, id: null });
    }

    if (!data) {
      return NextResponse.json({ image_url: null, created_at: null, id: null });
    }

    return NextResponse.json({
      image_url: data.image_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
      id: data.id,
    });
  } catch (err) {
    console.error('[GET /api/admin/popup] Unexpected error:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const imageUrl = String(body?.image_url || '').trim();

    if (!imageUrl) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
    }

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('popup_notifications')
      .insert({ image_url: imageUrl })
      .select('id, image_url, created_at, updated_at')
      .single();

    if (error) {
      console.error('Popup insert error:', error);
      return NextResponse.json({ error: 'failed to save' }, { status: 500 });
    }

    return NextResponse.json({
      image_url: data.image_url,
      created_at: data.created_at,
      id: data.id,
    });
  } catch (err) {
    console.error('Popup API exception:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


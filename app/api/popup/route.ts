import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('popup_notifications')
      .select('id, image_url, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ image_url: null, created_at: null });
    }

    return NextResponse.json({
      image_url: data.image_url,
      created_at: data.created_at,
      id: data.id,
    });
  } catch (err) {
    console.error('Popup API error:', err);
    return NextResponse.json({ image_url: null, created_at: null });
  }
}


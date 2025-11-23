import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const sb = createServiceClient();
    
    const [settingsRes, itemsRes] = await Promise.all([
      sb.from('privacy_policy_settings').select('*').maybeSingle(),
      sb.from('privacy_policy_items').select('*').order('order_index', { ascending: true }),
    ]);

    if (settingsRes.error) {
      console.error('[Privacy GET] Settings error:', settingsRes.error);
    }

    if (itemsRes.error) {
      console.error('[Privacy GET] Items error:', itemsRes.error);
    }

    return NextResponse.json({
      settings: {
        title: settingsRes.data?.title || 'นโยบายความเป็นส่วนตัว',
        description: settingsRes.data?.description || null,
      },
      items: itemsRes.data || [],
    });
  } catch (err) {
    console.error('[Privacy GET] Exception:', err);
    return NextResponse.json(
      { settings: { title: 'นโยบายความเป็นส่วนตัว', description: null }, items: [] },
      { status: 500 }
    );
  }
}


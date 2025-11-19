import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const sb = createServiceClient();
    
    const [settingsRes, itemsRes] = await Promise.all([
      sb.from('terms_policy_settings').select('*').maybeSingle(),
      sb.from('terms_policy_items').select('*').order('order_index', { ascending: true }),
    ]);

    if (settingsRes.error) {
      console.error('[Policy GET] Settings error:', settingsRes.error);
    }

    if (itemsRes.error) {
      console.error('[Policy GET] Items error:', itemsRes.error);
    }

    return NextResponse.json({
      settings: {
        title: settingsRes.data?.title || 'ข้อกำหนดการใช้งาน',
        description: settingsRes.data?.description || null,
      },
      items: itemsRes.data || [],
    });
  } catch (err) {
    console.error('[Policy GET] Exception:', err);
    return NextResponse.json(
      { settings: { title: 'ข้อกำหนดการใช้งาน', description: null }, items: [] },
      { status: 500 }
    );
  }
}


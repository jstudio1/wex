import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = createServiceClient();
    const { data: settingsRows } = await sb
      .from('settings')
      .select('key, value')
      .in('key', ['RECAPTCHA_ENABLED', 'RECAPTCHA_SITE_KEY']);

    const settings: Record<string, string> = {};
    for (const row of settingsRows || []) {
      settings[row.key as string] = row.value as string;
    }

    return NextResponse.json({
      enabled: settings.RECAPTCHA_ENABLED === 'true',
      siteKey: settings.RECAPTCHA_SITE_KEY || ''
    });
  } catch (error) {
    console.error('[GET /api/recaptcha/config] Error:', error);
    return NextResponse.json({ enabled: false, siteKey: '' });
  }
}


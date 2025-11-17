import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  try {
    // ใช้ service client เพื่อ bypass RLS
    const sb = createServiceClient();
    
    // Query ทั้งหมดก่อน แล้ว filter ใน code
    const { data: allData, error } = await sb
      .from('settings')
      .select('key, value');
    
    if (error) {
      console.error('Announcement API error:', error);
      return NextResponse.json({ text: '', enabled: false }, { status: 500 });
    }

    // Filter เฉพาะ announcement settings
    const announcementData = (allData || []).filter(
      (row: any) => row?.key === 'ANNOUNCEMENT_TEXT' || row?.key === 'ANNOUNCEMENT_ENABLED'
    );

    const map: Record<string, string> = {};
    if (announcementData && Array.isArray(announcementData)) {
      for (const row of announcementData) {
        if (row && row.key && row.value !== undefined) {
          map[row.key as string] = String(row.value);
        }
      }
    }

    const enabledStr = map.ANNOUNCEMENT_ENABLED || 'false';
    const enabled = enabledStr === 'true';
    const text = (map.ANNOUNCEMENT_TEXT || '').trim();

    return NextResponse.json({
      text,
      enabled,
    });
  } catch (err) {
    console.error('Announcement API exception:', err);
    return NextResponse.json({ text: '', enabled: false }, { status: 500 });
  }
}

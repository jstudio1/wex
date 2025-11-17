import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

// เพิ่ม maxDuration เพื่อรองรับ request ที่ใช้เวลานาน
export const maxDuration = 300; // 5 นาที
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'missing_secret' }, { status: 500 });

  try {
    const body = await req.json().catch(() => ({}));
    const providerId = body.provider_id;
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // เพิ่ม timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 290000); // 4.8 นาที (น้อยกว่า maxDuration เล็กน้อย)
    
    try {
      const res = await fetch(`${siteUrl}/api/social/sync`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider_id: providerId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const json = await res.json();
      return NextResponse.json(json, { status: res.status });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('Social sync proxy timeout:', err);
      return NextResponse.json({ 
        error: 'timeout', 
        detail: 'Request timeout - การซิงค์ข้อมูลใช้เวลานานเกินไป กรุณาลองใหม่' 
      }, { status: 504 });
    }
    console.error('Social sync proxy error:', err);
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ' 
    }, { status: 500 });
  }
}


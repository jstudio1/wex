import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'missing_secret' }, { status: 500 });

  try {
    const { searchParams } = new URL(req.url);
    const productType = searchParams.get('product_type');
    
    // อ่าน body เพื่อส่ง company_ids ไปด้วย
    let body: any = null;
    try {
      const bodyText = await req.text();
      if (bodyText) {
        body = JSON.parse(bodyText);
      }
    } catch {
      // ถ้าไม่มี body หรือ parse ไม่ได้ ให้ใช้ null
    }
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const url = new URL(`${siteUrl}/api/products/sync`);
    if (productType) {
      url.searchParams.set('product_type', productType);
    }
    
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: res.status });
    }
    
    const json = await res.json();
    return NextResponse.json(json);
  } catch (err) {
    console.error('Sync error:', err);
    if ((err as any)?.name === 'AbortError' || (err as any)?.message?.includes('timeout')) {
      return NextResponse.json({ 
        error: 'timeout', 
        detail: 'การ Sync ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง' 
      }, { status: 504 });
    }
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด' 
    }, { status: 500 });
  }
}


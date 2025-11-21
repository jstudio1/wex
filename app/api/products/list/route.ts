import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const WEPAY_PRODUCTS_URL =
  process.env.WEPAY_PRODUCTS_URL ||
  'https://www.wepay.in.th/comp_export.php?json';

type WepayGame = {
  company_id: string;
  company_name: string;
  fee?: number;
  denomination?: Array<{ price: number; description: string | null }>;
  gameservers?: Array<{ value: string; name: string }>;
  refs_format?: { ref1?: string };
};

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const productType = searchParams.get('product_type') as 'gtopup' | 'mtopup' | 'cashcard' | null;
    
    const upstream = await fetch(WEPAY_PRODUCTS_URL, { 
      cache: 'no-store',
    });
    
    if (!upstream.ok) {
      console.error('[wePAY list] fetch failed', upstream.status, upstream.statusText);
      return NextResponse.json({ error: 'fetch_failed', detail: 'ไม่สามารถดึงข้อมูลจาก wePAY ได้' }, { status: upstream.status || 500 });
    }
    
    const payload = await upstream.json();
    
    const gtopupProducts: WepayGame[] = Array.isArray(payload?.data?.gtopup) ? payload.data.gtopup : [];
    const mtopupProducts = Array.isArray(payload?.data?.mtopup) ? payload.data.mtopup : [];
    const cashcardProducts = Array.isArray(payload?.data?.cashcard) ? payload.data.cashcard : [];
    
    // ดึงข้อมูลเกมที่มีอยู่ในระบบแล้ว
    const sb = createServiceClient();
    let existingProductsQuery = sb
      .from('products')
      .select('provider_company_id, name, product_type');
    
    if (productType) {
      existingProductsQuery = existingProductsQuery.eq('product_type', productType);
    }
    
    const { data: existingProducts } = await existingProductsQuery;
    const existingMap = new Map<string, boolean>();
    for (const p of existingProducts || []) {
      const companyId = String(p.provider_company_id || '').trim();
      if (companyId) {
        existingMap.set(companyId, true);
      }
    }
    
    // สร้างรายการเกมพร้อมสถานะ
    let games: Array<{ company_id: string; company_name: string; exists: boolean }> = [];
    
    if (productType === 'gtopup' || !productType) {
      games = gtopupProducts.map((g) => ({
        company_id: g.company_id,
        company_name: g.company_name || g.company_id,
        exists: existingMap.has(g.company_id),
      }));
    } else if (productType === 'mtopup') {
      games = mtopupProducts.map((g: any) => ({
        company_id: g.company_id,
        company_name: g.company_name || g.company_id,
        exists: existingMap.has(g.company_id),
      }));
    } else if (productType === 'cashcard') {
      games = cashcardProducts.map((g: any) => ({
        company_id: g.company_id,
        company_name: g.company_name || g.company_id,
        exists: existingMap.has(g.company_id),
      }));
    }

    // เรียงตามชื่อ
    games.sort((a, b) => a.company_name.localeCompare(b.company_name, 'th'));

    return NextResponse.json({ 
      ok: true, 
      data: games 
    });
  } catch (err) {
    console.error('[wePAY list] error:', err);
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด' 
    }, { status: 500 });
  }
}

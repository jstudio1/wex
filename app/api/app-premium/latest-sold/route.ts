import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const sb = createServiceClient();
    
    // ดึงประวัติการขายล่าสุด (orders ทั้งหมด ไม่ซ้ำ product)
    const { data: orders, error } = await sb
      .from('app_premium_orders')
      .select(`
        id,
        created_at,
        app_premium_products (
          id,
          display_name,
          name,
          image_url,
          icon_url
        )
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error fetching latest sold app premium orders:', error);
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    // แสดงประวัติการขายล่าสุดทั้งหมด (ไม่ต้อง unique)
    const result = (orders || [])
      .filter((order: any) => order.app_premium_products)
      .map((order: any) => {
        const product = order.app_premium_products;
        return {
          id: product.id,
          order_id: order.id,
          display_name: product.display_name || product.name,
          name: product.name,
          image_url: product.image_url,
          icon_url: product.icon_url,
          sold_at: order.created_at,
        };
      })
      .slice(0, 20); // แสดง 20 orders ล่าสุด

    return NextResponse.json(
      { data: result },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('Latest sold app premium orders error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


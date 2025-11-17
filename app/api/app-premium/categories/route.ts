import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const sb = createServiceClient();
  
  // ดึงหมวดหมู่ที่เผยแพร่
  const { data: categories, error: catError } = await sb
    .from('app_premium_categories')
    .select('*')
    .eq('is_published', true)
    .order('display_order', { ascending: true })
    .order('id', { ascending: true });

  if (catError) {
    console.error('Error fetching app premium categories:', catError);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }

  if (!categories || categories.length === 0) {
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }

  // ดึงสินค้าที่เผยแพร่และมีสต็อก
  const { data: products, error: prodError } = await sb
    .from('app_premium_products')
    .select('id, name, display_name, is_published, stock, app_category')
    .eq('is_published', true)
    .gt('stock', 0);

  if (prodError) {
    console.error('Error fetching products for category filter:', prodError);
    // ถ้า error ให้ return categories ทั้งหมด (fallback)
    return NextResponse.json(categories || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }

  // กรองหมวดหมู่ที่มีสินค้าที่มีสต็อก - ใช้ app_category ตรงๆ
  const productsList = products || [];
  const categoriesWithStock = categories.filter((category) => {
    const categoryKey = category.category.toLowerCase();
    
    // ตรวจสอบว่ามีสินค้าที่มี app_category ตรงกับ category key และมีสต็อก
    return productsList.some((product: any) => {
      const stock = Number(product.stock || 0);
      if (stock <= 0) return false;
      
      const productAppCategory = (product.app_category || '').toLowerCase();
      return productAppCategory === categoryKey;
    });
  });

  return NextResponse.json(categoriesWithStock, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

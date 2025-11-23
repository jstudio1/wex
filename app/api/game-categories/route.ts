import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { unstable_noStore as noStore } from 'next/cache';

// Force dynamic rendering - no cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: Request) {
  noStore();
  try {
    const sb = createServiceClient();
    const { data: categories, error } = await sb
      .from('game_categories')
      .select('*')
      .eq('is_published', true)
      .order('id', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }
    
    if (!categories || categories.length === 0) {
      return NextResponse.json({ ok: true, data: [] }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    const categoriesWithStats = await Promise.all(
      categories.map(async (cat) => {
        const { data: accounts } = await sb
          .from('game_accounts')
          .select('price, stock')
          .eq('game_category_id', cat.id)
          .eq('is_published', true)
          .gt('stock', 0);

        const prices = (accounts || [])
          .map(acc => Number(acc.price))
          .filter(p => !isNaN(p) && p > 0);

        const accountCount = accounts?.length || 0;
        const minPrice = prices.length > 0 ? Math.min(...prices) : undefined;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : undefined;

        return {
          ...cat,
          accountCount,
          minPrice,
          maxPrice,
          image_url: cat.image_url || null
        };
      })
    );

    return NextResponse.json(
      { ok: true, data: categoriesWithStats },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


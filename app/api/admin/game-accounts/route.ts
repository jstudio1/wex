import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search');

    const sb = createServiceClient();
    let query = sb
      .from('game_accounts')
      .select('*, game_categories(id, name, slug)')
      .order('created_at', { ascending: false });

    // Filter by category
    if (categoryId) {
      query = query.eq('game_category_id', categoryId);
    }

    // Search
    if (search) {
      query = query.or(`game_name.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[admin][game-accounts] fetch error:', error);
      const missingRelation =
        error.code === '42P01' ||
        /relation .* does not exist/i.test(error.message || '') ||
        /table .* does not exist/i.test(error.message || '');

      if (missingRelation) {
        console.warn('[admin][game-accounts] relation missing, returning default payload');
        return NextResponse.json({
          ok: true,
          data: [],
          permissions: [],
          categories: [],
        });
      }
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    let dataWithPrices = data;
    try {
      const { data: priceRows, error: priceErr } = await sb
        .from('game_account_prices')
        .select('game_account_id, permission_id, price');

      if (!priceErr && Array.isArray(priceRows)) {
        const grouped = priceRows.reduce<Record<number, Array<{ permission_id: number; price: number }>>>(
          (acc, row) => {
            const key = row.game_account_id as number;
            const arr = acc[key] || [];
            arr.push({ permission_id: row.permission_id, price: row.price });
            acc[key] = arr;
            return acc;
          },
          {}
        );

        dataWithPrices = (data || []).map((acc) => ({
          ...acc,
          game_account_prices: grouped[acc.id] || [],
        }));
      } else if (priceErr) {
        const missingRelation =
          priceErr.code === '42P01' ||
          priceErr.code === 'PGRST200' ||
          /relation .* does not exist/i.test(priceErr.message || '');
        if (missingRelation) {
          console.warn('[admin][game-accounts] prices relation missing, skipping join');
          dataWithPrices = (data || []).map((acc) => ({
            ...acc,
            game_account_prices: [],
          }));
        } else {
          console.error('[admin][game-accounts] price fetch error:', priceErr);
        }
      }
    } catch (priceUnexpected) {
      console.warn('[admin][game-accounts] unexpected price fetch error:', priceUnexpected);
      dataWithPrices = (data || []).map((acc) => ({
        ...acc,
        game_account_prices: [],
      }));
    }

    return NextResponse.json({ ok: true, data: dataWithPrices });
  } catch (err) {
    console.error('Admin game accounts GET error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const DEFAULT_STATS = {
  totalUsers: 0,
  totalOrders: 0,
  totalTopup: 0,
  premiumStock: 0,
};

export async function GET() {
  try {
    const sb = createServiceClient();
    const [
      usersRes,
      ordersRes,
      gameOrdersRes,
      socialOrdersRes,
      cashcardOrdersRes,
      premiumOrdersRes,
      slipData,
      redeemData,
      premiumStockData,
    ] = await Promise.all([
      sb.from('users').select('id', { count: 'exact', head: true }),
      sb.from('orders').select('id', { count: 'exact', head: true }),
      sb.from('game_account_orders').select('id', { count: 'exact', head: true }),
      sb.from('social_orders').select('id', { count: 'exact', head: true }),
      sb.from('cashcard_orders').select('id', { count: 'exact', head: true }),
      sb.from('app_premium_orders').select('id', { count: 'exact', head: true }),
      sb.from('slip_history').select('amount').in('status', ['success', 'completed']),
      sb.from('redeem_code_usage').select('points'),
      sb.from('app_premium_products').select('stock').eq('is_published', true),
    ]);

    const totalUsers = usersRes?.count ?? 0;
    const totalOrders =
      (ordersRes?.count ?? 0) +
      (gameOrdersRes?.count ?? 0) +
      (socialOrdersRes?.count ?? 0) +
      (cashcardOrdersRes?.count ?? 0) +
      (premiumOrdersRes?.count ?? 0);

    // Calculate topup sum manually
    const slipSum = (slipData?.data || []).reduce((sum, row: any) => {
      const amount = Number(row?.amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const redeemSum = (redeemData?.data || []).reduce((sum, row: any) => {
      const points = Number(row?.points);
      return sum + (Number.isFinite(points) ? points : 0);
    }, 0);

    const totalTopup = slipSum + redeemSum;

    // Calculate premium stock sum manually
    const premiumStock = Math.max(
      0,
      Math.floor(
        (premiumStockData?.data || []).reduce((sum, row: any) => {
          const stock = Number(row?.stock);
          return sum + (Number.isFinite(stock) ? stock : 0);
        }, 0)
      )
    );

    return NextResponse.json(
      {
        totalUsers,
        totalOrders,
        totalTopup: Number.isFinite(totalTopup) ? totalTopup : 0,
        premiumStock,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      },
    );
  } catch (error) {
    console.error('home stats api error:', error);
    return NextResponse.json(DEFAULT_STATS, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
}



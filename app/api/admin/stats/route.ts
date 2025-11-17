import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const sb = createServiceClient();
    
    // Get basic counts
    const [
      products,
      publishedProducts,
      categories,
      orders,
      users,
      coupons,
      redeemCodes,
      popups,
      gameAccounts,
      socialOrders,
      gameAccountOrders
    ] = await Promise.all([
      sb.from('products').select('id', { count: 'exact', head: true }),
      sb.from('products').select('id', { count: 'exact', head: true }).eq('is_published', true),
      sb.from('categories').select('id', { count: 'exact', head: true }),
      sb.from('orders').select('id', { count: 'exact', head: true }),
      sb.from('users').select('id', { count: 'exact', head: true }),
      sb.from('coupons').select('id', { count: 'exact', head: true }),
      sb.from('redeem_codes').select('id', { count: 'exact', head: true }),
      sb.from('popup_notifications').select('id', { count: 'exact', head: true }),
      sb.from('game_accounts').select('id', { count: 'exact', head: true }),
      sb.from('social_orders').select('id', { count: 'exact', head: true }),
      sb.from('game_account_orders').select('id', { count: 'exact', head: true }),
    ]);

    // Get revenue data
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Regular orders revenue
    const [allOrders, last7DaysOrders, last30DaysOrders, thisMonthOrders, lastMonthOrders] = await Promise.all([
      sb.from('orders').select('price, created_at'),
      sb.from('orders').select('price, created_at').gte('created_at', last7Days.toISOString()),
      sb.from('orders').select('price, created_at').gte('created_at', last30Days.toISOString()),
      sb.from('orders').select('price, created_at').gte('created_at', thisMonth.toISOString()),
      sb.from('orders').select('price, created_at').gte('created_at', lastMonth.toISOString()).lt('created_at', thisMonth.toISOString()),
    ]);

    // Game account orders revenue
    const [allGameOrders, last7DaysGameOrders, last30DaysGameOrders, thisMonthGameOrders, lastMonthGameOrders] = await Promise.all([
      sb.from('game_account_orders').select('price, created_at'),
      sb.from('game_account_orders').select('price, created_at').gte('created_at', last7Days.toISOString()),
      sb.from('game_account_orders').select('price, created_at').gte('created_at', last30Days.toISOString()),
      sb.from('game_account_orders').select('price, created_at').gte('created_at', thisMonth.toISOString()),
      sb.from('game_account_orders').select('price, created_at').gte('created_at', lastMonth.toISOString()).lt('created_at', thisMonth.toISOString()),
    ]);

    // Social orders revenue
    const [allSocialOrders, last7DaysSocialOrders, last30DaysSocialOrders, thisMonthSocialOrders, lastMonthSocialOrders] = await Promise.all([
      sb.from('social_orders').select('price, created_at'),
      sb.from('social_orders').select('price, created_at').gte('created_at', last7Days.toISOString()),
      sb.from('social_orders').select('price, created_at').gte('created_at', last30Days.toISOString()),
      sb.from('social_orders').select('price, created_at').gte('created_at', thisMonth.toISOString()),
      sb.from('social_orders').select('price, created_at').gte('created_at', lastMonth.toISOString()).lt('created_at', thisMonth.toISOString()),
    ]);

    const calculateRevenue = (orders: any[]) => {
      return orders.reduce((sum, order) => sum + (Number(order.price) || 0), 0);
    };

    const totalRevenue = calculateRevenue(allOrders.data || []) + calculateRevenue(allGameOrders.data || []) + calculateRevenue(allSocialOrders.data || []);
    const revenueLast7Days = calculateRevenue(last7DaysOrders.data || []) + calculateRevenue(last7DaysGameOrders.data || []) + calculateRevenue(last7DaysSocialOrders.data || []);
    const revenueLast30Days = calculateRevenue(last30DaysOrders.data || []) + calculateRevenue(last30DaysGameOrders.data || []) + calculateRevenue(last30DaysSocialOrders.data || []);
    const revenueThisMonth = calculateRevenue(thisMonthOrders.data || []) + calculateRevenue(thisMonthGameOrders.data || []) + calculateRevenue(thisMonthSocialOrders.data || []);
    const revenueLastMonth = calculateRevenue(lastMonthOrders.data || []) + calculateRevenue(lastMonthGameOrders.data || []) + calculateRevenue(lastMonthSocialOrders.data || []);

    // Daily revenue for last 7 days (for chart)
    const dailyRevenue: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const [dayOrders, dayGameOrders, daySocialOrders] = await Promise.all([
        sb.from('orders').select('price').gte('created_at', dayStart.toISOString()).lt('created_at', dayEnd.toISOString()),
        sb.from('game_account_orders').select('price').gte('created_at', dayStart.toISOString()).lt('created_at', dayEnd.toISOString()),
        sb.from('social_orders').select('price').gte('created_at', dayStart.toISOString()).lt('created_at', dayEnd.toISOString()),
      ]);

      const dayRevenue = calculateRevenue(dayOrders.data || []) + calculateRevenue(dayGameOrders.data || []) + calculateRevenue(daySocialOrders.data || []);
      dailyRevenue.push({
        date: dateStr,
        revenue: dayRevenue
      });
    }

    // Monthly revenue for last 6 months (for chart)
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthStr = monthDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'short' });
      
      const [monthOrders, monthGameOrders, monthSocialOrders] = await Promise.all([
        sb.from('orders').select('price').gte('created_at', monthStart.toISOString()).lt('created_at', monthEnd.toISOString()),
        sb.from('game_account_orders').select('price').gte('created_at', monthStart.toISOString()).lt('created_at', monthEnd.toISOString()),
        sb.from('social_orders').select('price').gte('created_at', monthStart.toISOString()).lt('created_at', monthEnd.toISOString()),
      ]);

      const monthRev = calculateRevenue(monthOrders.data || []) + calculateRevenue(monthGameOrders.data || []) + calculateRevenue(monthSocialOrders.data || []);
      monthlyRevenue.push({
        month: monthStr,
        revenue: monthRev
      });
    }

    // Order counts
    const totalOrders = (orders.count || 0) + (gameAccountOrders.count || 0) + (socialOrders.count || 0);
    const ordersLast7Days = (last7DaysOrders.data || []).length + (last7DaysGameOrders.data || []).length + (last7DaysSocialOrders.data || []).length;
    const ordersLast30Days = (last30DaysOrders.data || []).length + (last30DaysGameOrders.data || []).length + (last30DaysSocialOrders.data || []).length;
    const ordersThisMonth = (thisMonthOrders.data || []).length + (thisMonthGameOrders.data || []).length + (thisMonthSocialOrders.data || []).length;

    return NextResponse.json({
      products: products.count || 0,
      publishedProducts: publishedProducts.count || 0,
      categories: categories.count || 0,
      orders: totalOrders,
      users: users.count || 0,
      coupons: coupons.count || 0,
      redeemCodes: redeemCodes.count || 0,
      popups: popups.count || 0,
      gameAccounts: gameAccounts.count || 0,
      // Revenue stats
      totalRevenue,
      revenueLast7Days,
      revenueLast30Days,
      revenueThisMonth,
      revenueLastMonth,
      // Order counts
      ordersLast7Days,
      ordersLast30Days,
      ordersThisMonth,
      // Chart data
      dailyRevenue,
      monthlyRevenue,
    });
  } catch (err) {
    console.error('Stats API error:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const sb = createServiceClient();
    
    // Get basic counts
    const [
      categories,
      orders,
      users,
      coupons,
      redeemCodes,
      socialOrders,
      appPremiumOrders
    ] = await Promise.all([
      sb.from('categories').select('id', { count: 'exact', head: true }),
      sb.from('orders').select('id', { count: 'exact', head: true }),
      sb.from('users').select('id', { count: 'exact', head: true }),
      sb.from('coupons').select('id', { count: 'exact', head: true }),
      sb.from('redeem_codes').select('id', { count: 'exact', head: true }),
      sb.from('social_orders').select('id', { count: 'exact', head: true }),
      sb.from('app_premium_orders').select('id', { count: 'exact', head: true }),
    ]);

    // Get revenue data
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Regular orders revenue - แยกตาม product_type
    const [allGtopupOrders, allMtopupOrders, allCashcardOrders, last7DaysGtopupOrders, last7DaysMtopupOrders, last7DaysCashcardOrders, last30DaysGtopupOrders, last30DaysMtopupOrders, last30DaysCashcardOrders, thisMonthGtopupOrders, thisMonthMtopupOrders, thisMonthCashcardOrders, lastMonthGtopupOrders, lastMonthMtopupOrders, lastMonthCashcardOrders] = await Promise.all([
      // All time
      sb.from('orders').select('price, created_at').eq('product_type', 'gtopup'),
      sb.from('orders').select('price, created_at').eq('product_type', 'mtopup'),
      sb.from('orders').select('price, created_at').eq('product_type', 'cashcard'),
      // Last 7 days
      sb.from('orders').select('price, created_at').eq('product_type', 'gtopup').gte('created_at', last7Days.toISOString()),
      sb.from('orders').select('price, created_at').eq('product_type', 'mtopup').gte('created_at', last7Days.toISOString()),
      sb.from('orders').select('price, created_at').eq('product_type', 'cashcard').gte('created_at', last7Days.toISOString()),
      // Last 30 days
      sb.from('orders').select('price, created_at').eq('product_type', 'gtopup').gte('created_at', last30Days.toISOString()),
      sb.from('orders').select('price, created_at').eq('product_type', 'mtopup').gte('created_at', last30Days.toISOString()),
      sb.from('orders').select('price, created_at').eq('product_type', 'cashcard').gte('created_at', last30Days.toISOString()),
      // This month
      sb.from('orders').select('price, created_at').eq('product_type', 'gtopup').gte('created_at', thisMonth.toISOString()),
      sb.from('orders').select('price, created_at').eq('product_type', 'mtopup').gte('created_at', thisMonth.toISOString()),
      sb.from('orders').select('price, created_at').eq('product_type', 'cashcard').gte('created_at', thisMonth.toISOString()),
      // Last month
      sb.from('orders').select('price, created_at').eq('product_type', 'gtopup').gte('created_at', lastMonth.toISOString()).lt('created_at', thisMonth.toISOString()),
      sb.from('orders').select('price, created_at').eq('product_type', 'mtopup').gte('created_at', lastMonth.toISOString()).lt('created_at', thisMonth.toISOString()),
      sb.from('orders').select('price, created_at').eq('product_type', 'cashcard').gte('created_at', lastMonth.toISOString()).lt('created_at', thisMonth.toISOString()),
    ]);

    // App Premium orders revenue
    const [allAppPremiumOrders, last7DaysAppPremiumOrders, last30DaysAppPremiumOrders, thisMonthAppPremiumOrders, lastMonthAppPremiumOrders] = await Promise.all([
      sb.from('app_premium_orders').select('price, created_at'),
      sb.from('app_premium_orders').select('price, created_at').gte('created_at', last7Days.toISOString()),
      sb.from('app_premium_orders').select('price, created_at').gte('created_at', last30Days.toISOString()),
      sb.from('app_premium_orders').select('price, created_at').gte('created_at', thisMonth.toISOString()),
      sb.from('app_premium_orders').select('price, created_at').gte('created_at', lastMonth.toISOString()).lt('created_at', thisMonth.toISOString()),
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

    // รวมยอดขายทุกประเภท
    const totalGtopupRevenue = calculateRevenue(allGtopupOrders.data || []);
    const totalMtopupRevenue = calculateRevenue(allMtopupOrders.data || []);
    const totalCashcardRevenue = calculateRevenue(allCashcardOrders.data || []);
    const totalAppPremiumRevenue = calculateRevenue(allAppPremiumOrders.data || []);
    const totalSocialRevenue = calculateRevenue(allSocialOrders.data || []);
    
    const totalRevenue = totalGtopupRevenue + totalMtopupRevenue + totalCashcardRevenue + totalAppPremiumRevenue + totalSocialRevenue;
    
    const revenueLast7Days = 
      calculateRevenue(last7DaysGtopupOrders.data || []) + 
      calculateRevenue(last7DaysMtopupOrders.data || []) + 
      calculateRevenue(last7DaysCashcardOrders.data || []) + 
      calculateRevenue(last7DaysAppPremiumOrders.data || []) + 
      calculateRevenue(last7DaysSocialOrders.data || []);
    
    const revenueLast30Days = 
      calculateRevenue(last30DaysGtopupOrders.data || []) + 
      calculateRevenue(last30DaysMtopupOrders.data || []) + 
      calculateRevenue(last30DaysCashcardOrders.data || []) + 
      calculateRevenue(last30DaysAppPremiumOrders.data || []) + 
      calculateRevenue(last30DaysSocialOrders.data || []);
    
    const revenueThisMonth = 
      calculateRevenue(thisMonthGtopupOrders.data || []) + 
      calculateRevenue(thisMonthMtopupOrders.data || []) + 
      calculateRevenue(thisMonthCashcardOrders.data || []) + 
      calculateRevenue(thisMonthAppPremiumOrders.data || []) + 
      calculateRevenue(thisMonthSocialOrders.data || []);
    
    const revenueLastMonth = 
      calculateRevenue(lastMonthGtopupOrders.data || []) + 
      calculateRevenue(lastMonthMtopupOrders.data || []) + 
      calculateRevenue(lastMonthCashcardOrders.data || []) + 
      calculateRevenue(lastMonthAppPremiumOrders.data || []) + 
      calculateRevenue(lastMonthSocialOrders.data || []);

    // Daily revenue for last 7 days (for chart)
    const dailyRevenue: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const [dayGtopupOrders, dayMtopupOrders, dayCashcardOrders, dayAppPremiumOrders, daySocialOrders] = await Promise.all([
        sb.from('orders').select('price').eq('product_type', 'gtopup').gte('created_at', dayStart.toISOString()).lt('created_at', dayEnd.toISOString()),
        sb.from('orders').select('price').eq('product_type', 'mtopup').gte('created_at', dayStart.toISOString()).lt('created_at', dayEnd.toISOString()),
        sb.from('orders').select('price').eq('product_type', 'cashcard').gte('created_at', dayStart.toISOString()).lt('created_at', dayEnd.toISOString()),
        sb.from('app_premium_orders').select('price').gte('created_at', dayStart.toISOString()).lt('created_at', dayEnd.toISOString()),
        sb.from('social_orders').select('price').gte('created_at', dayStart.toISOString()).lt('created_at', dayEnd.toISOString()),
      ]);

      const dayRevenue = 
        calculateRevenue(dayGtopupOrders.data || []) + 
        calculateRevenue(dayMtopupOrders.data || []) + 
        calculateRevenue(dayCashcardOrders.data || []) + 
        calculateRevenue(dayAppPremiumOrders.data || []) + 
        calculateRevenue(daySocialOrders.data || []);
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
      
      const [monthGtopupOrders, monthMtopupOrders, monthCashcardOrders, monthAppPremiumOrders, monthSocialOrders] = await Promise.all([
        sb.from('orders').select('price').eq('product_type', 'gtopup').gte('created_at', monthStart.toISOString()).lt('created_at', monthEnd.toISOString()),
        sb.from('orders').select('price').eq('product_type', 'mtopup').gte('created_at', monthStart.toISOString()).lt('created_at', monthEnd.toISOString()),
        sb.from('orders').select('price').eq('product_type', 'cashcard').gte('created_at', monthStart.toISOString()).lt('created_at', monthEnd.toISOString()),
        sb.from('app_premium_orders').select('price').gte('created_at', monthStart.toISOString()).lt('created_at', monthEnd.toISOString()),
        sb.from('social_orders').select('price').gte('created_at', monthStart.toISOString()).lt('created_at', monthEnd.toISOString()),
      ]);

      const monthRev = 
        calculateRevenue(monthGtopupOrders.data || []) + 
        calculateRevenue(monthMtopupOrders.data || []) + 
        calculateRevenue(monthCashcardOrders.data || []) + 
        calculateRevenue(monthAppPremiumOrders.data || []) + 
        calculateRevenue(monthSocialOrders.data || []);
      monthlyRevenue.push({
        month: monthStr,
        revenue: monthRev
      });
    }

    // Order counts - รวมทุกประเภท
    const totalOrders = (orders.count || 0) + (appPremiumOrders.count || 0) + (socialOrders.count || 0);
    const ordersLast7Days = 
      (last7DaysGtopupOrders.data || []).length + 
      (last7DaysMtopupOrders.data || []).length + 
      (last7DaysCashcardOrders.data || []).length + 
      (last7DaysAppPremiumOrders.data || []).length + 
      (last7DaysSocialOrders.data || []).length;
    const ordersLast30Days = 
      (last30DaysGtopupOrders.data || []).length + 
      (last30DaysMtopupOrders.data || []).length + 
      (last30DaysCashcardOrders.data || []).length + 
      (last30DaysAppPremiumOrders.data || []).length + 
      (last30DaysSocialOrders.data || []).length;
    const ordersThisMonth = 
      (thisMonthGtopupOrders.data || []).length + 
      (thisMonthMtopupOrders.data || []).length + 
      (thisMonthCashcardOrders.data || []).length + 
      (thisMonthAppPremiumOrders.data || []).length + 
      (thisMonthSocialOrders.data || []).length;

    // Order counts by type
    const ordersByType = {
      gtopup: {
        total: (allGtopupOrders.data || []).length,
        last7Days: (last7DaysGtopupOrders.data || []).length,
        last30Days: (last30DaysGtopupOrders.data || []).length,
        thisMonth: (thisMonthGtopupOrders.data || []).length,
      },
      mtopup: {
        total: (allMtopupOrders.data || []).length,
        last7Days: (last7DaysMtopupOrders.data || []).length,
        last30Days: (last30DaysMtopupOrders.data || []).length,
        thisMonth: (thisMonthMtopupOrders.data || []).length,
      },
      cashcard: {
        total: (allCashcardOrders.data || []).length,
        last7Days: (last7DaysCashcardOrders.data || []).length,
        last30Days: (last30DaysCashcardOrders.data || []).length,
        thisMonth: (thisMonthCashcardOrders.data || []).length,
      },
      app_premium: {
        total: (allAppPremiumOrders.data || []).length,
        last7Days: (last7DaysAppPremiumOrders.data || []).length,
        last30Days: (last30DaysAppPremiumOrders.data || []).length,
        thisMonth: (thisMonthAppPremiumOrders.data || []).length,
      },
      social: {
        total: (allSocialOrders.data || []).length,
        last7Days: (last7DaysSocialOrders.data || []).length,
        last30Days: (last30DaysSocialOrders.data || []).length,
        thisMonth: (thisMonthSocialOrders.data || []).length,
      },
    };

    // Topup revenue (ยอดเติมเงิน) - จากหน้า wallet/topup
    const [allSlipHistory, allRedeemCodes, allTruewalletTopup, allAdminTopup] = await Promise.all([
      sb.from('slip_history').select('amount, created_at').in('status', ['success', 'completed']),
      sb.from('redeem_code_usage').select('points, created_at'),
      sb.from('truewallet_topup').select('amount, created_at').eq('status', 'success'),
      sb.from('admin_topup_history').select('amount, created_at'),
    ]);

    const calculateTopupRevenue = (records: any[], amountField: string = 'amount') => {
      return records.reduce((sum, record) => {
        const amount = Number(record[amountField] || record.points || 0);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0);
    };

    const totalTopupRevenue = 
      calculateTopupRevenue(allSlipHistory.data || []) + 
      calculateTopupRevenue(allRedeemCodes.data || [], 'points') + 
      calculateTopupRevenue(allTruewalletTopup.data || []) + 
      calculateTopupRevenue(allAdminTopup.data || []);

    // Topup revenue for last 7 days, 30 days, this month
    const [last7DaysSlip, last7DaysRedeem, last7DaysTruewallet, last7DaysAdmin] = await Promise.all([
      sb.from('slip_history').select('amount').in('status', ['success', 'completed']).gte('created_at', last7Days.toISOString()),
      sb.from('redeem_code_usage').select('points').gte('created_at', last7Days.toISOString()),
      sb.from('truewallet_topup').select('amount').eq('status', 'success').gte('created_at', last7Days.toISOString()),
      sb.from('admin_topup_history').select('amount').gte('created_at', last7Days.toISOString()),
    ]);

    const [last30DaysSlip, last30DaysRedeem, last30DaysTruewallet, last30DaysAdmin] = await Promise.all([
      sb.from('slip_history').select('amount').in('status', ['success', 'completed']).gte('created_at', last30Days.toISOString()),
      sb.from('redeem_code_usage').select('points').gte('created_at', last30Days.toISOString()),
      sb.from('truewallet_topup').select('amount').eq('status', 'success').gte('created_at', last30Days.toISOString()),
      sb.from('admin_topup_history').select('amount').gte('created_at', last30Days.toISOString()),
    ]);

    const [thisMonthSlip, thisMonthRedeem, thisMonthTruewallet, thisMonthAdmin] = await Promise.all([
      sb.from('slip_history').select('amount').in('status', ['success', 'completed']).gte('created_at', thisMonth.toISOString()),
      sb.from('redeem_code_usage').select('points').gte('created_at', thisMonth.toISOString()),
      sb.from('truewallet_topup').select('amount').eq('status', 'success').gte('created_at', thisMonth.toISOString()),
      sb.from('admin_topup_history').select('amount').gte('created_at', thisMonth.toISOString()),
    ]);

    const topupRevenueLast7Days = 
      calculateTopupRevenue(last7DaysSlip.data || []) + 
      calculateTopupRevenue(last7DaysRedeem.data || [], 'points') + 
      calculateTopupRevenue(last7DaysTruewallet.data || []) + 
      calculateTopupRevenue(last7DaysAdmin.data || []);

    const topupRevenueLast30Days = 
      calculateTopupRevenue(last30DaysSlip.data || []) + 
      calculateTopupRevenue(last30DaysRedeem.data || [], 'points') + 
      calculateTopupRevenue(last30DaysTruewallet.data || []) + 
      calculateTopupRevenue(last30DaysAdmin.data || []);

    const topupRevenueThisMonth = 
      calculateTopupRevenue(thisMonthSlip.data || []) + 
      calculateTopupRevenue(thisMonthRedeem.data || [], 'points') + 
      calculateTopupRevenue(thisMonthTruewallet.data || []) + 
      calculateTopupRevenue(thisMonthAdmin.data || []);

    return NextResponse.json({
      categories: categories.count || 0,
      orders: totalOrders,
      users: users.count || 0,
      coupons: coupons.count || 0,
      redeemCodes: redeemCodes.count || 0,
      // Revenue stats (รวมทุกประเภท)
      totalRevenue,
      revenueLast7Days,
      revenueLast30Days,
      revenueThisMonth,
      revenueLastMonth,
      // Revenue by type (แยกตามประเภท)
      revenueByType: {
        gtopup: {
          total: totalGtopupRevenue,
          last7Days: calculateRevenue(last7DaysGtopupOrders.data || []),
          last30Days: calculateRevenue(last30DaysGtopupOrders.data || []),
          thisMonth: calculateRevenue(thisMonthGtopupOrders.data || []),
        },
        mtopup: {
          total: totalMtopupRevenue,
          last7Days: calculateRevenue(last7DaysMtopupOrders.data || []),
          last30Days: calculateRevenue(last30DaysMtopupOrders.data || []),
          thisMonth: calculateRevenue(thisMonthMtopupOrders.data || []),
        },
        cashcard: {
          total: totalCashcardRevenue,
          last7Days: calculateRevenue(last7DaysCashcardOrders.data || []),
          last30Days: calculateRevenue(last30DaysCashcardOrders.data || []),
          thisMonth: calculateRevenue(thisMonthCashcardOrders.data || []),
        },
        app_premium: {
          total: totalAppPremiumRevenue,
          last7Days: calculateRevenue(last7DaysAppPremiumOrders.data || []),
          last30Days: calculateRevenue(last30DaysAppPremiumOrders.data || []),
          thisMonth: calculateRevenue(thisMonthAppPremiumOrders.data || []),
        },
        social: {
          total: totalSocialRevenue,
          last7Days: calculateRevenue(last7DaysSocialOrders.data || []),
          last30Days: calculateRevenue(last30DaysSocialOrders.data || []),
          thisMonth: calculateRevenue(thisMonthSocialOrders.data || []),
        },
      },
      // Order counts by type
      ordersByType,
      // Topup revenue (ยอดเติมเงิน)
      totalTopupRevenue,
      topupRevenueLast7Days,
      topupRevenueLast30Days,
      topupRevenueThisMonth,
      // Order counts
      ordersLast7Days,
      ordersLast30Days,
      ordersThisMonth,
      // Chart data
      dailyRevenue,
      monthlyRevenue,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err) {
    console.error('Stats API error:', err);
    return NextResponse.json({ error: 'unexpected' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
}


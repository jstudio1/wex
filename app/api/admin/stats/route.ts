import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

// dashboard admin ไม่ต้อง real-time ทุกวินาที ใช้ cache ระยะสั้นช่วยลดโหลดได้
export const revalidate = 15;

const STUCK_THRESHOLD_MINUTES = 10;
const PENDING_STATES = ['pending', 'processing', 'confirming'];

type RevenueRow = { price: number | string | null; created_at: string };

function inRange(row: RevenueRow, from?: Date, to?: Date) {
  const t = new Date(row.created_at).getTime();
  if (from && t < from.getTime()) return false;
  if (to && t >= to.getTime()) return false;
  return true;
}

function sumPrice(rows: RevenueRow[], from?: Date, to?: Date) {
  let sum = 0;
  let count = 0;
  for (const row of rows) {
    if (!inRange(row, from, to)) continue;
    sum += Number(row.price) || 0;
    count++;
  }
  return { sum, count };
}

function sumAmount(rows: Array<{ amount?: number | string | null; points?: number | string | null; created_at: string }>, from?: Date, to?: Date) {
  let sum = 0;
  for (const row of rows) {
    if (!inRange(row as any, from, to)) continue;
    const amount = Number(row.amount ?? row.points ?? 0);
    sum += Number.isFinite(amount) ? amount : 0;
  }
  return sum;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const sb = createServiceClient();

    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const stuckThreshold = new Date(now.getTime() - STUCK_THRESHOLD_MINUTES * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // ดึงข้อมูลดิบทั้งหมดครั้งเดียว แล้วคำนวณช่วงเวลาต่างๆ ใน JS แทนการยิง query ซ้ำต่อช่วงเวลา (ลดจาก ~65 queries เหลือ ~12)
    const [
      categories,
      users,
      coupons,
      redeemCodes,
      ordersRes,
      appPremiumOrdersRes,
      socialOrdersRes,
      slipHistoryRes,
      redeemUsageRes,
      truewalletRes,
      adminTopupRes,
      productsRes,
    ] = await Promise.all([
      sb.from('categories').select('id', { count: 'exact', head: true }),
      sb.from('users').select('id', { count: 'exact', head: true }),
      sb.from('coupons').select('id', { count: 'exact', head: true }),
      sb.from('redeem_codes').select('id', { count: 'exact', head: true }),
      sb.from('orders').select('id, transaction_id, price, state, created_at, product_id, product_type'),
      sb.from('app_premium_orders').select('price, created_at, status'),
      sb.from('social_orders').select('price, created_at, status'),
      sb.from('slip_history').select('amount, created_at').in('status', ['success', 'completed']),
      sb.from('redeem_code_usage').select('points, created_at'),
      sb.from('truewallet_topup').select('amount, created_at').eq('status', 'success'),
      sb.from('admin_topup_history').select('amount, created_at'),
      sb.from('products').select('id, name, product_type'),
    ]);

    const allOrders = ordersRes.data || [];
    const allAppPremiumOrders = appPremiumOrdersRes.data || [];
    const allSocialOrders = socialOrdersRes.data || [];

    const productNameById = new Map<number, string>();
    for (const p of productsRes.data || []) {
      productNameById.set(p.id as number, (p as any).name || `#${p.id}`);
    }

    const ordersByProductType = (type: string) => allOrders.filter((o) => o.product_type === type);
    const completedOrders = allOrders.filter((o) => o.state === 'completed');

    const calcRevenue = (rows: RevenueRow[], from?: Date, to?: Date) => sumPrice(rows, from, to).sum;
    const calcCount = (rows: RevenueRow[], from?: Date, to?: Date) => sumPrice(rows, from, to).count;

    const gtopup = ordersByProductType('gtopup');
    const mtopup = ordersByProductType('mtopup');
    const cashcard = ordersByProductType('cashcard');

    const revenueByType = {
      gtopup: {
        total: calcRevenue(gtopup),
        last7Days: calcRevenue(gtopup, last7Days),
        last30Days: calcRevenue(gtopup, last30Days),
        thisMonth: calcRevenue(gtopup, thisMonth),
      },
      mtopup: {
        total: calcRevenue(mtopup),
        last7Days: calcRevenue(mtopup, last7Days),
        last30Days: calcRevenue(mtopup, last30Days),
        thisMonth: calcRevenue(mtopup, thisMonth),
      },
      cashcard: {
        total: calcRevenue(cashcard),
        last7Days: calcRevenue(cashcard, last7Days),
        last30Days: calcRevenue(cashcard, last30Days),
        thisMonth: calcRevenue(cashcard, thisMonth),
      },
      app_premium: {
        total: calcRevenue(allAppPremiumOrders),
        last7Days: calcRevenue(allAppPremiumOrders, last7Days),
        last30Days: calcRevenue(allAppPremiumOrders, last30Days),
        thisMonth: calcRevenue(allAppPremiumOrders, thisMonth),
      },
      social: {
        total: calcRevenue(allSocialOrders),
        last7Days: calcRevenue(allSocialOrders, last7Days),
        last30Days: calcRevenue(allSocialOrders, last30Days),
        thisMonth: calcRevenue(allSocialOrders, thisMonth),
      },
    };

    const ordersByType = {
      gtopup: {
        total: gtopup.length,
        last7Days: calcCount(gtopup, last7Days),
        last30Days: calcCount(gtopup, last30Days),
        thisMonth: calcCount(gtopup, thisMonth),
      },
      mtopup: {
        total: mtopup.length,
        last7Days: calcCount(mtopup, last7Days),
        last30Days: calcCount(mtopup, last30Days),
        thisMonth: calcCount(mtopup, thisMonth),
      },
      cashcard: {
        total: cashcard.length,
        last7Days: calcCount(cashcard, last7Days),
        last30Days: calcCount(cashcard, last30Days),
        thisMonth: calcCount(cashcard, thisMonth),
      },
      app_premium: {
        total: allAppPremiumOrders.length,
        last7Days: calcCount(allAppPremiumOrders, last7Days),
        last30Days: calcCount(allAppPremiumOrders, last30Days),
        thisMonth: calcCount(allAppPremiumOrders, thisMonth),
      },
      social: {
        total: allSocialOrders.length,
        last7Days: calcCount(allSocialOrders, last7Days),
        last30Days: calcCount(allSocialOrders, last30Days),
        thisMonth: calcCount(allSocialOrders, thisMonth),
      },
    };

    const totalRevenue = Object.values(revenueByType).reduce((sum, r) => sum + r.total, 0);
    const revenueLast7Days = Object.values(revenueByType).reduce((sum, r) => sum + r.last7Days, 0);
    const revenueLast30Days = Object.values(revenueByType).reduce((sum, r) => sum + r.last30Days, 0);
    const revenueThisMonth = Object.values(revenueByType).reduce((sum, r) => sum + r.thisMonth, 0);

    const revenueLastMonth =
      calcRevenue(gtopup, lastMonth, thisMonth) +
      calcRevenue(mtopup, lastMonth, thisMonth) +
      calcRevenue(cashcard, lastMonth, thisMonth) +
      calcRevenue(allAppPremiumOrders, lastMonth, thisMonth) +
      calcRevenue(allSocialOrders, lastMonth, thisMonth);

    const totalOrders = allOrders.length + allAppPremiumOrders.length + allSocialOrders.length;
    const ordersLast7Days = Object.values(ordersByType).reduce((sum, o) => sum + o.last7Days, 0);
    const ordersLast30Days = Object.values(ordersByType).reduce((sum, o) => sum + o.last30Days, 0);
    const ordersThisMonth = Object.values(ordersByType).reduce((sum, o) => sum + o.thisMonth, 0);

    // กราฟยอดขายรายวัน (7 วัน) และรายเดือน (6 เดือน) คำนวณจากข้อมูลที่ดึงมาแล้ว ไม่ query เพิ่ม
    const allRevenueRows: RevenueRow[] = [...allOrders, ...allAppPremiumOrders, ...allSocialOrders];

    const dailyRevenue: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      dailyRevenue.push({ date: dateStr, revenue: calcRevenue(allRevenueRows, dayStart, dayEnd) });
    }

    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthStr = monthDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'short' });
      monthlyRevenue.push({ month: monthStr, revenue: calcRevenue(allRevenueRows, monthStart, monthEnd) });
    }

    // ยอดเติมเงิน (wallet topup)
    const totalTopupRevenue =
      sumAmount(slipHistoryRes.data || []) +
      sumAmount(redeemUsageRes.data || []) +
      sumAmount(truewalletRes.data || []) +
      sumAmount(adminTopupRes.data || []);
    const topupRevenueLast7Days =
      sumAmount(slipHistoryRes.data || [], last7Days) +
      sumAmount(redeemUsageRes.data || [], last7Days) +
      sumAmount(truewalletRes.data || [], last7Days) +
      sumAmount(adminTopupRes.data || [], last7Days);
    const topupRevenueLast30Days =
      sumAmount(slipHistoryRes.data || [], last30Days) +
      sumAmount(redeemUsageRes.data || [], last30Days) +
      sumAmount(truewalletRes.data || [], last30Days) +
      sumAmount(adminTopupRes.data || [], last30Days);
    const topupRevenueThisMonth =
      sumAmount(slipHistoryRes.data || [], thisMonth) +
      sumAmount(redeemUsageRes.data || [], thisMonth) +
      sumAmount(truewalletRes.data || [], thisMonth) +
      sumAmount(adminTopupRes.data || [], thisMonth);

    // สินค้าขายดี Top 5 แยกตามประเภท (จากออเดอร์ที่สำเร็จแล้วเท่านั้น)
    const buildTopProducts = (type: string) => {
      const rows = completedOrders.filter((o) => o.product_type === type);
      const byProduct = new Map<number, { product_id: number; name: string; quantity: number; revenue: number }>();
      for (const row of rows) {
        const pid = row.product_id as number;
        if (!pid) continue;
        const existing = byProduct.get(pid) || {
          product_id: pid,
          name: productNameById.get(pid) || `#${pid}`,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += 1;
        existing.revenue += Number(row.price) || 0;
        byProduct.set(pid, existing);
      }
      return Array.from(byProduct.values())
        .sort((a, b) => (b.quantity - a.quantity) || (b.revenue - a.revenue))
        .slice(0, 5);
    };

    const topProducts = {
      gtopup: buildTopProducts('gtopup'),
      mtopup: buildTopProducts('mtopup'),
      cashcard: buildTopProducts('cashcard'),
    };

    // คำสั่งซื้อที่ล้มเหลว / ค้างอยู่นานเกินไป (ใช้เตือนแอดมินว่าระบบเติม/provider มีปัญหา)
    const failedOrders = allOrders.filter((o) => o.state === 'failed');
    const failedLast24h = failedOrders.filter((o) => new Date(o.created_at).getTime() >= last24h.getTime()).length;

    const stuckOrdersRaw = allOrders
      .filter((o) => PENDING_STATES.includes(o.state as string) && new Date(o.created_at).getTime() < stuckThreshold.getTime())
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const stuckOrders = stuckOrdersRaw.slice(0, 10).map((o) => ({
      id: o.id,
      transaction_id: (o as any).transaction_id ?? null,
      product_id: o.product_id,
      product_name: o.product_id ? productNameById.get(o.product_id as number) || `#${o.product_id}` : 'ไม่พบสินค้า',
      product_type: o.product_type,
      state: o.state,
      created_at: o.created_at,
      minutesStuck: Math.floor((now.getTime() - new Date(o.created_at).getTime()) / 60000),
    }));

    const stuckSocialCount = allSocialOrders.filter(
      (o: any) => ['pending', 'processing'].includes(o.status) && new Date(o.created_at).getTime() < stuckThreshold.getTime()
    ).length;

    const orderHealth = {
      failedCount: failedOrders.length,
      failedLast24h,
      stuckPendingCount: stuckOrdersRaw.length,
      stuckSocialCount,
      stuckOrders,
      thresholdMinutes: STUCK_THRESHOLD_MINUTES,
    };

    return NextResponse.json(
      {
        categories: categories.count || 0,
        orders: totalOrders,
        users: users.count || 0,
        coupons: coupons.count || 0,
        redeemCodes: redeemCodes.count || 0,
        totalRevenue,
        revenueLast7Days,
        revenueLast30Days,
        revenueThisMonth,
        revenueLastMonth,
        revenueByType,
        ordersByType,
        totalTopupRevenue,
        topupRevenueLast7Days,
        topupRevenueLast30Days,
        topupRevenueThisMonth,
        ordersLast7Days,
        ordersLast30Days,
        ordersThisMonth,
        dailyRevenue,
        monthlyRevenue,
        topProducts,
        orderHealth,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=0, s-maxage=15, stale-while-revalidate=30',
        },
      }
    );
  } catch (err) {
    console.error('Stats API error:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

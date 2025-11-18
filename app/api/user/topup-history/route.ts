export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

type RawUser = {
  id: number | string;
  username?: string | null;
  email?: string | null;
};

type RawSlip = {
  id: number;
  user_id: number;
  transaction_id: string | null;
  amount: number | string | null;
  points_added: number | string | null;
  status: string | null;
  error_message?: string | null;
  created_at: string;
};

type RawTrueWallet = {
  id: number;
  user_id: number;
  voucher_code: string | null;
  amount: number | string | null;
  points: number | string | null;
  status: string | null;
  error_message?: string | null;
  created_at: string;
};

type RawRedeem = {
  id: number;
  user_id: number;
  code_id: number;
  points: number | string | null;
  created_at?: string | null;
  redeemed_at?: string | null;
  redeem_codes?: {
    code?: string | null;
    description?: string | null;
  } | null;
};

type RawAdminTopup = {
  id: number;
  user_id: number;
  admin_id: number;
  amount: number | string | null;
  points_added: number | string | null;
  note: string | null;
  created_at: string;
  admin?: RawUser | null;
};

type TopupRecord = {
  id: string;
  sourceId: number;
  type: 'slip' | 'truewallet' | 'redeem' | 'admin';
  methodLabel: string;
  amount: number;
  points: number;
  status: string;
  state: 'success' | 'failed' | 'pending' | 'unknown';
  reference: string;
  note: string | null;
  created_at: string;
};

function normalizeNumber(val: number | string | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? 0 : num;
}

function normalizeStatus(raw: string | null | undefined): TopupRecord['state'] {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase();
  if (lower.includes('success') || lower.includes('completed') || lower.includes('สำเร็จ')) return 'success';
  if (lower.includes('fail') || lower.includes('error') || lower.includes('ไม่สำเร็จ')) return 'failed';
  if (lower.includes('pending') || lower.includes('waiting') || lower.includes('รอดำเนินการ')) return 'pending';
  return 'unknown';
}

function normalizeStatusLabel(raw: string | null | undefined): string {
  if (!raw) return 'ไม่ทราบสถานะ';
  const lower = raw.toLowerCase();
  if (lower.includes('success') || lower.includes('completed') || lower.includes('สำเร็จ')) return 'สำเร็จ';
  if (lower.includes('fail') || lower.includes('error') || lower.includes('ไม่สำเร็จ')) return 'ไม่สำเร็จ';
  if (lower.includes('pending') || lower.includes('waiting') || lower.includes('รอดำเนินการ')) return 'รอดำเนินการ';
  return 'ไม่ทราบสถานะ';
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const limitParam = parseInt(url.searchParams.get('limit') ?? '25', 10);
    const limit = Math.min(100, limitParam > 0 ? limitParam : 25);
    const methodFilter = (url.searchParams.get('method') || 'all').toLowerCase();
    const statusFilter = (url.searchParams.get('status') || 'all').toLowerCase();

    const fetchCount = Math.min(1000, limit * Math.max(page, 4));

    const sb = createServiceClient();
    const userId = user.id;

    const [slipResult, truewalletResult, redeemResult, adminTopupResult] = await Promise.all([
      sb
        .from('slip_history')
        .select('id, user_id, transaction_id, amount, points_added, status, error_message, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(fetchCount),
      sb
        .from('truewallet_topup')
        .select('id, user_id, voucher_code, amount, points, status, error_message, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(fetchCount),
      sb
        .from('redeem_code_usage')
        .select('id, user_id, code_id, points, created_at, redeemed_at, redeem_codes:redeem_codes(code, description)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(fetchCount),
      sb
        .from('admin_topup_history')
        .select('id, user_id, admin_id, amount, points_added, note, created_at, admin:users!admin_topup_history_admin_id_fkey(id, username, email)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(fetchCount),
    ]);

    // Gracefully handle missing tables
    const slipRecords: TopupRecord[] = ((slipResult.data as unknown) as RawSlip[] | null || []).map((item) => ({
      id: `slip-${item.id}`,
      sourceId: item.id,
      type: 'slip',
      methodLabel: 'โอนผ่านสลิป',
      amount: normalizeNumber(item.amount),
      points: normalizeNumber(item.points_added || item.amount),
      status: normalizeStatusLabel(item.status),
      state: normalizeStatus(item.status),
      reference: item.transaction_id || '-',
      note: item.error_message || null,
      created_at: item.created_at,
    }));

    const truewalletRecords: TopupRecord[] = ((truewalletResult.data as unknown) as RawTrueWallet[] | null || []).map((item) => ({
      id: `truewallet-${item.id}`,
      sourceId: item.id,
      type: 'truewallet',
      methodLabel: 'TrueMoney Gift',
      amount: normalizeNumber(item.amount),
      points: normalizeNumber(item.points || item.amount),
      status: normalizeStatusLabel(item.status),
      state: normalizeStatus(item.status),
      reference: item.voucher_code || '-',
      note: item.error_message || null,
      created_at: item.created_at,
    }));

    const adminTopupRecords: TopupRecord[] = ((adminTopupResult.data as unknown) as RawAdminTopup[] | null || []).map((item) => ({
      id: `admin-${item.id}`,
      sourceId: item.id,
      type: 'admin',
      methodLabel: 'เติมเงินโดย Admin',
      amount: normalizeNumber(item.amount),
      points: normalizeNumber(item.points_added),
      status: 'สำเร็จ',
      state: 'success',
      reference: item.admin?.username || `Admin #${item.admin_id}`,
      note: item.note || null,
      created_at: item.created_at,
    }));

    const redeemRecords: TopupRecord[] = ((redeemResult.data as unknown) as RawRedeem[] | null || []).map((item) => ({
      id: `redeem-${item.id}`,
      sourceId: item.id,
      type: 'redeem',
      methodLabel: 'โค้ดเติมพอยต์',
      amount: normalizeNumber(item.points),
      points: normalizeNumber(item.points),
      status: normalizeStatusLabel('redeemed'),
      state: 'success',
      reference: item.redeem_codes?.code || '-',
      note: item.redeem_codes?.description || null,
      created_at: item.created_at || item.redeemed_at || new Date().toISOString(),
    }));

    const combined = [...slipRecords, ...truewalletRecords, ...redeemRecords, ...adminTopupRecords].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const filtered = combined.filter((record) => {
      const matchesMethod = methodFilter === 'all' || record.type === methodFilter || (methodFilter === 'admin' && record.type === 'admin');
      const matchesStatus = statusFilter === 'all' || record.state === statusFilter;
      return matchesMethod && matchesStatus;
    });

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginated = filtered.slice(startIndex, endIndex);

    const totalAmount = filtered.reduce((sum, r) => sum + r.amount, 0);
    const totalPoints = filtered.reduce((sum, r) => sum + r.points, 0);
    const successCount = filtered.filter((r) => r.state === 'success').length;
    const failedCount = filtered.filter((r) => r.state === 'failed').length;

    return NextResponse.json({
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        total,
        totalAmount,
        totalPoints,
        successCount,
        failedCount,
      },
    });
  } catch (err) {
    console.error('[GET /api/user/topup-history] Unexpected error:', err);
    return NextResponse.json(
      {
        error: 'unexpected',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}


export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
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
  users?: RawUser | null;
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
  users?: RawUser | null;
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
  users?: RawUser | null;
};

type TopupRecord = {
  id: string;
  sourceId: number;
  type: 'slip' | 'truewallet' | 'redeem';
  methodLabel: string;
  amount: number;
  points: number;
  status: string;
  state: 'success' | 'failed' | 'pending' | 'unknown';
  reference: string;
  note: string | null;
  created_at: string;
  user: {
    id: number | string | null;
    username: string | null;
    email: string | null;
  };
};

const normalizeNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeStatus = (raw: string | null | undefined): TopupRecord['state'] => {
  const value = (raw || '').toLowerCase();
  if (['success', 'successful', 'completed', 'redeemed'].includes(value)) return 'success';
  if (['pending', 'processing', 'waiting'].includes(value)) return 'pending';
  if (['failed', 'error', 'rejected', 'cancelled'].includes(value)) return 'failed';
  return 'unknown';
};

const normalizeStatusLabel = (raw: string | null | undefined): string => {
  const value = (raw || '').toLowerCase();
  if (['success', 'successful', 'completed', 'redeemed'].includes(value)) return 'สำเร็จ';
  if (['pending', 'processing', 'waiting'].includes(value)) return 'รอดำเนินการ';
  if (['failed', 'error', 'rejected', 'cancelled'].includes(value)) return 'ไม่สำเร็จ';
  return 'ไม่ทราบสถานะ';
};

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const limitParam = parseInt(url.searchParams.get('limit') ?? '25', 10);
    const limit = Math.min(100, limitParam > 0 ? limitParam : 25);
    const methodFilter = (url.searchParams.get('method') || 'all').toLowerCase();
    const statusFilter = (url.searchParams.get('status') || 'all').toLowerCase();
    const searchTerm = (url.searchParams.get('search') || '').trim().toLowerCase();

    const fetchCount = Math.min(1000, limit * Math.max(page, 4));

    const sb = createServiceClient();
    const [slipResult, truewalletResult, redeemResult] = await Promise.all([
      sb
        .from('slip_history')
        .select('id, user_id, transaction_id, amount, points_added, status, error_message, created_at, users:users(id, username, email)')
        .order('created_at', { ascending: false })
        .limit(fetchCount),
      sb
        .from('truewallet_topup')
        .select('id, user_id, voucher_code, amount, points, status, error_message, created_at, users:users(id, username, email)')
        .order('created_at', { ascending: false })
        .limit(fetchCount),
      sb
        .from('redeem_code_usage')
        .select('id, user_id, code_id, points, created_at, redeemed_at, redeem_codes:redeem_codes(code, description), users:users(id, username, email)')
        .order('created_at', { ascending: false })
        .limit(fetchCount),
    ]);

    if (slipResult.error) {
      console.error('[GET /api/admin/topup-history] slip history error:', slipResult.error);
      return NextResponse.json({ error: 'db_error', detail: slipResult.error.message }, { status: 500 });
    }
    if (truewalletResult.error) {
      console.error('[GET /api/admin/topup-history] truewallet history error:', truewalletResult.error);
      return NextResponse.json({ error: 'db_error', detail: truewalletResult.error.message }, { status: 500 });
    }
    if (redeemResult.error) {
      console.error('[GET /api/admin/topup-history] redeem history error:', redeemResult.error);
      return NextResponse.json({ error: 'db_error', detail: redeemResult.error.message }, { status: 500 });
    }

    const mapUser = (raw?: RawUser | null) => ({
      id: raw?.id ?? null,
      username: raw?.username ?? null,
      email: raw?.email ?? null,
    });

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
      user: mapUser(item.users),
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
      user: mapUser(item.users),
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
      reference: item.redeem_codes?.code || `CODE#${item.code_id}`,
      note: item.redeem_codes?.description || null,
      created_at: item.created_at || item.redeemed_at || new Date().toISOString(),
      user: mapUser(item.users),
    }));

    const combined = [...slipRecords, ...truewalletRecords, ...redeemRecords].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const filtered = combined.filter((record) => {
      const matchesMethod = methodFilter === 'all' || record.type === methodFilter;
      const matchesStatus = statusFilter === 'all' || record.state === statusFilter;
      const matchesSearch =
        !searchTerm ||
        (record.user.username && record.user.username.toLowerCase().includes(searchTerm)) ||
        (record.user.email && record.user.email.toLowerCase().includes(searchTerm)) ||
        (record.user.id && String(record.user.id).toLowerCase().includes(searchTerm)) ||
        record.reference.toLowerCase().includes(searchTerm) ||
        (record.note && record.note.toLowerCase().includes(searchTerm));
      return matchesMethod && matchesStatus && matchesSearch;
    });

    const total = filtered.length;
    const totalAmount = filtered.reduce((sum, rec) => sum + (Number.isFinite(rec.amount) ? rec.amount : rec.points), 0);
    const totalPoints = filtered.reduce((sum, rec) => sum + (Number.isFinite(rec.points) ? rec.points : rec.amount), 0);
    const successCount = filtered.filter((rec) => rec.state === 'success').length;
    const failedCount = filtered.filter((rec) => rec.state === 'failed').length;

    const start = (page - 1) * limit;
    const end = start + limit;
    const pageItems = filtered.slice(start, end);

    return NextResponse.json({
      data: pageItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        totalRecords: total,
        totalAmount,
        totalPoints,
        successCount,
        failedCount,
      },
    });
  } catch (err) {
    console.error('[GET /api/admin/topup-history] Unexpected error:', err);
    return NextResponse.json(
      {
        error: 'unexpected',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}



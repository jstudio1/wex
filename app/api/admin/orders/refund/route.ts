import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const transactionId: string | undefined = body.transaction_id;
    if (!transactionId) {
      return NextResponse.json({ error: 'bad_request', detail: 'missing transaction_id' }, { status: 400 });
    }

    const sb = createServiceClient();

    const { data: order, error: orderErr } = await sb
      .from('orders')
      .select('transaction_id, state, user_id, price')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (orderErr) return NextResponse.json({ error: 'db_error', detail: orderErr.message }, { status: 500 });
    if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // อนุญาตคืนเงินเฉพาะออเดอร์ที่ล้มเหลวเท่านั้น
    if (order.state !== 'failed') {
      return NextResponse.json({ error: 'invalid_state', detail: 'คืนเงินได้เฉพาะออเดอร์ที่สถานะล้มเหลวเท่านั้น' }, { status: 400 });
    }
    if (!order.user_id || !order.price) {
      return NextResponse.json({ error: 'invalid_order', detail: 'ออเดอร์นี้ไม่มีข้อมูล user หรือราคาที่ถูกต้อง' }, { status: 400 });
    }

    // กันคืนเงินซ้ำ: เช็คว่ามี log state = 'refunded' สำหรับ transaction นี้แล้วหรือยัง
    const { data: existingRefundLog } = await sb
      .from('order_status_logs')
      .select('id')
      .eq('transaction_id', transactionId)
      .eq('state', 'refunded')
      .maybeSingle();

    if (existingRefundLog) {
      return NextResponse.json({ error: 'already_refunded', detail: 'ออเดอร์นี้คืนเงินไปแล้ว' }, { status: 409 });
    }

    const { error: creditError } = await sb.rpc('wallet_credit', {
      u: order.user_id,
      amt: order.price,
    });

    if (creditError) {
      console.error('[ADMIN][REFUND] wallet_credit error:', creditError);
      return NextResponse.json({ error: 'credit_failed', detail: creditError.message }, { status: 500 });
    }

    await sb.from('order_status_logs').insert({
      transaction_id: transactionId,
      state: 'refunded',
      message: `คืนเงิน ${order.price} บาทเข้า wallet แล้ว (โดยแอดมิน)`,
    });

    return NextResponse.json({ ok: true, refunded_amount: order.price });
  } catch (err) {
    console.error('[ADMIN][REFUND] error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

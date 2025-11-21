import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

function parseFormBody(formBody: string) {
  const params = new URLSearchParams(formBody);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

async function parsePayload(req: Request) {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return req.json();
  }
  const textBody = await req.text();
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return parseFormBody(textBody);
  }
  try {
    return JSON.parse(textBody);
  } catch {
    return parseFormBody(textBody);
  }
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-webhook-secret');
  if (process.env.WEPAY_WEBHOOK_SECRET && secret !== process.env.WEPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await parsePayload(req);
    console.log('[WEBHOOK][WEPAY][REFUND] incoming payload:', body);
    
    const transactionId: string | undefined = body.transaction_id || body.transactionId;
    const destRef: string | undefined = body.dest_ref || body.destRef;
    const refundId: string | undefined = body.refund_id || body.refundId;
    const drawnAmount: string | undefined = body.drawn_amount || body.drawnAmount;

    if (!transactionId || !destRef) {
      return NextResponse.json({ 
        error: 'bad_payload', 
        detail: 'missing transaction_id or dest_ref' 
      }, { status: 400 });
    }

    const sb = createServiceClient();

    // หา refund record จาก dest_ref
    const { data: refund, error: refundError } = await sb
      .from('order_refunds')
      .select('id, transaction_id, user_id, order_id, state, drawn_amount, refund_id')
      .eq('dest_ref', destRef)
      .maybeSingle();

    if (refundError) {
      console.error('refund lookup error:', refundError);
      return NextResponse.json({ error: 'db_error', detail: refundError.message }, { status: 500 });
    }

    if (!refund) {
      console.warn('[WEBHOOK][WEPAY][REFUND] refund not found for dest_ref:', destRef);
      // ตอบกลับ SUCCEED เพื่อไม่ให้ wePAY retry
      return new Response(`SUCCEED|REFUND_NOT_FOUND`, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // ตรวจสอบว่าได้รับ callback ซ้ำหรือไม่
    if (refund.state === 'completed' || refund.state === 'failed') {
      console.log('[WEBHOOK][WEPAY][REFUND] duplicate callback, already processed:', destRef);
      return new Response(`SUCCEED|ALREADY_PROCESSED`, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const drawnAmountNum = drawnAmount ? parseFloat(drawnAmount) : 0;
    const newState = drawnAmountNum > 0 ? 'completed' : 'failed';

    // อัพเดท refund status
    const updatePayload: Record<string, any> = {
      refund_id: refundId || refund.refund_id,
      state: newState,
      drawn_amount: drawnAmountNum,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await sb
      .from('order_refunds')
      .update(updatePayload)
      .eq('id', refund.id);

    if (updateError) {
      console.error('refund update error:', updateError);
      return NextResponse.json({ error: 'db_error', detail: updateError.message }, { status: 500 });
    }

    // ถ้าดึงเงินคืนสำเร็จ (drawn_amount > 0) ให้คืนเงินให้ user
    if (drawnAmountNum > 0) {
      const { data: order } = await sb
        .from('orders')
        .select('price')
        .eq('id', refund.order_id)
        .single();

      if (order) {
        // คืนเงินให้ user (ใช้ drawn_amount ที่ดึงได้จริง)
        const creditRes = await sb.rpc('wallet_credit', { 
          u: refund.user_id, 
          amt: drawnAmountNum 
        });
        
        if (creditRes.error) {
          console.error('wallet_credit error:', creditRes.error);
          // ไม่ throw error เพราะ refund ถูกบันทึกแล้ว
        } else {
          console.log('[WEBHOOK][WEPAY][REFUND] credited user wallet:', refund.user_id, drawnAmountNum);
        }
      }
    }

    console.log('[WEBHOOK][WEPAY][REFUND] updated refund', destRef, 'state:', newState, 'drawn_amount:', drawnAmountNum);
    
    return new Response(`SUCCEED|REFUND_ID=${refundId || ''}`, {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('wePAY refund webhook error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


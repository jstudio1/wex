import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { toWepayState } from '@/lib/providers/wepay';

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
    console.log('[WEBHOOK][WEPAY] incoming payload:', body);
    const transactionId: string | undefined = body.transaction_id || body.transactionId;
    const statusCode: string | undefined = body.status || body.state;

    if (!transactionId) {
      return NextResponse.json({ error: 'bad_payload', detail: 'missing transaction_id' }, { status: 400 });
    }

    const sb = createServiceClient();
    const { state, isTerminal } = toWepayState(statusCode);
    const updatePayload: Record<string, any> = {
      state,
      result_code: statusCode || null,
      updated_at: new Date().toISOString()
    };
    if (isTerminal) {
      updatePayload.finished_at = new Date().toISOString();
    }

    const { data: existing } = await sb
      .from('orders')
      .select('state')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    const { error } = await sb
      .from('orders')
      .update(updatePayload)
      .eq('transaction_id', transactionId);

    if (error) {
      console.error('wePAY webhook update error:', error);
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    if (existing && existing.state !== state) {
      try {
        await sb.from('order_status_logs').insert({
          transaction_id: transactionId,
          state,
          message: body.sms || body.operator_trxnsid || null
        });
      } catch (logErr) {
        console.warn('Failed to insert order status log:', logErr);
      }
    }

    console.log('[WEBHOOK][WEPAY] updated order', transactionId, 'state:', state, 'result_code:', statusCode);
    return new Response(`SUCCEED|ORDER_ID=${transactionId}`, {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('wePAY webhook error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



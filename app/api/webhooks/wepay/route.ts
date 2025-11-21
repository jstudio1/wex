import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { toWepayState, getWepayOrderOutput } from '@/lib/providers/wepay';

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
    
    // ดึงข้อมูล order เพื่อตรวจสอบ product_type
    const { data: existing } = await sb
      .from('orders')
      .select('state, product_type')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    const updatePayload: Record<string, any> = {
      state,
      result_code: statusCode || null,
      updated_at: new Date().toISOString()
    };
    if (isTerminal) {
      updatePayload.finished_at = new Date().toISOString();
      
      // สำหรับ cashcard เมื่อสถานะเป็น completed ให้ดึง output (รหัสบัตรเติมเงิน)
      if (existing?.product_type === 'cashcard' && (state === 'completed' || state === 'success')) {
        // ดึงข้อมูลจาก webhook payload ก่อน (cashcard_ref1, cashcard_ref2, sms)
        const output: Record<string, string> = {};
        
        if (body.cashcard_ref1) {
          output.serial = body.cashcard_ref1;
          output.card_code = body.cashcard_ref1;
        }
        if (body.cashcard_ref2) {
          output.password = body.cashcard_ref2;
          output.card_pin = body.cashcard_ref2;
          output.pin = body.cashcard_ref2;
        }
        
        // ถ้ามี sms ให้ parse
        if (body.sms) {
          const smsMatch = body.sms.match(/serial_no:([^,]+),password:(.+)/);
          if (smsMatch) {
            output.serial = smsMatch[1];
            output.card_code = smsMatch[1];
            output.password = smsMatch[2];
            output.card_pin = smsMatch[2];
            output.pin = smsMatch[2];
          }
        }
        
        // ถ้ามีข้อมูล output จาก webhook ให้เก็บไว้
        if (Object.keys(output).length > 0) {
          updatePayload.output_json = output;
          console.log('[WEBHOOK][WEPAY] Extracted output from webhook payload:', transactionId, output);
        } else {
          // ถ้าไม่มีใน webhook payload ให้ลองดึงจาก API (อาจจะช้า)
          try {
            const apiOutput = await getWepayOrderOutput(transactionId);
            if (apiOutput) {
              updatePayload.output_json = apiOutput;
              console.log('[WEBHOOK][WEPAY] Fetched output from API:', transactionId, apiOutput);
            }
          } catch (err) {
            console.warn('[WEBHOOK][WEPAY] Failed to fetch output from API (will retry later):', err);
            // ไม่ throw error เพราะ order update สำเร็จแล้ว
          }
        }
      }
    }

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



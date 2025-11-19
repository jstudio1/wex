import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getWepayOrderOutput, toWepayState, WepayError } from '@/lib/providers/wepay';

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { transaction_ids } = body;

    if (!transaction_ids || !Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return NextResponse.json({ error: 'invalid_transaction_ids' }, { status: 400 });
    }

    const sb = createServiceClient();
    
    // ดึงออเดอร์ที่ user เป็นเจ้าของ
    const { data: userOrders, error: userOrdersError } = await sb
      .from('orders')
      .select('transaction_id')
      .eq('user_id', user.id)
      .in('transaction_id', transaction_ids);

    if (userOrdersError) {
      return NextResponse.json({ error: 'db_error', detail: userOrdersError.message }, { status: 500 });
    }

    const validTransactionIds = (userOrders || []).map((o) => o.transaction_id);
    if (validTransactionIds.length === 0) {
      return NextResponse.json({ error: 'no_valid_orders' }, { status: 400 });
    }

    // ดึงสถานะจาก wePAY สำหรับแต่ละ transaction_id
    const updates: Promise<unknown>[] = [];

    for (const txId of validTransactionIds) {
      updates.push(
        (async () => {
          try {
            const orderData = await getWepayOrderOutput(txId);
            if (!orderData) return;
            console.log('[ORDERS][STATUS] fetched from wepay', txId, orderData);

            // อ่านสถานะเดิม
            const { data: existing } = await sb
              .from('orders')
              .select('state')
              .eq('transaction_id', txId)
              .eq('user_id', user.id)
              .maybeSingle();

            const { state: newState, isTerminal } = toWepayState(orderData.status);

            // อัพเดทสถานะใน database
            const updatePayload: Record<string, any> = {
              state: newState,
              result_code: orderData.status === '00000' ? null : String(orderData.status || ''),
              updated_at: new Date().toISOString()
            };
            if (isTerminal) {
              updatePayload.finished_at = new Date().toISOString();
            }

            const { error: updateErr, count } = await sb
              .from('orders')
              .update(updatePayload, { count: 'exact' })
              .eq('transaction_id', txId)
              .eq('user_id', user.id);

            if (updateErr) {
              console.error('[ORDERS][STATUS] update failed', txId, updateErr);
              return;
            }
            if (!count) {
              console.warn('[ORDERS][STATUS] update matched 0 rows', txId);
            } else {
              console.log('[ORDERS][STATUS] updated order state in DB', txId, updatePayload);
            }

            // ถ้ามีการเปลี่ยนสถานะ ให้เขียน log (ถ้ามีตาราง)
            if (existing?.state !== newState) {
              console.log('[ORDERS][STATUS] state changed', txId, 'from', existing?.state, 'to', newState);
              try {
                const { data: lastLog } = await sb
                  .from('order_status_logs')
                  .select('state')
                  .eq('transaction_id', txId)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (!lastLog || lastLog.state !== newState) {
                await sb
                  .from('order_status_logs')
                  .insert({
                    transaction_id: txId,
                    state: newState,
                      message: orderData.sms || orderData.operator_trxnsid || null
                  });
                } else {
                  console.log('[ORDERS][STATUS] skip log insert, same state as last log');
                }
              } catch (e) {
                console.warn('[ORDERS][STATUS] log insert skipped', e);
              }
            } else {
              console.log('[ORDERS][STATUS] state unchanged', txId, newState);
            }
          } catch (err) {
            if (err instanceof WepayError) {
              console.error(`wePAY status error for ${txId}:`, err.response);
              return;
            }
            console.error(`Error fetching order ${txId}:`, err);
          }
        })()
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ ok: true, updated: validTransactionIds.length });
  } catch (error) {
    console.error('orders status refresh error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


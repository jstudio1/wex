import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-keys';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://x.24payseller.com';

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const API_KEY = await getApiKey('API_KEY_24PAY');
  if (!API_KEY) return NextResponse.json({ error: 'missing_api_key' }, { status: 500 });

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

    // ดึงสถานะจาก External API สำหรับแต่ละ transaction_id
    const updates: Promise<unknown>[] = [];

    for (const txId of validTransactionIds) {
      updates.push(
        (async () => {
          try {
            const res = await fetch(`${API_BASE}/agent/orders/${txId}`, {
              headers: { 'X-Api-Key': API_KEY }
            });

            if (!res.ok) {
              console.error(`Failed to fetch order ${txId}:`, res.status);
              return;
            }

            const orderData = await res.json();

            // อ่านสถานะเดิม
            const { data: existing } = await sb
              .from('orders')
              .select('state')
              .eq('transaction_id', txId)
              .eq('user_id', user.id)
              .maybeSingle();

            const newState = orderData.state || null;

            // อัพเดทสถานะใน database
            await sb
              .from('orders')
              .update({
                state: newState,
                result_code: orderData.result_code || null,
                finished_at: orderData.finishedAt || null,
                updated_at: new Date().toISOString()
              })
              .eq('transaction_id', txId)
              .eq('user_id', user.id);

            // ถ้ามีการเปลี่ยนสถานะ ให้เขียน log (ถ้ามีตาราง)
            if (existing?.state !== newState) {
              try {
                await sb
                  .from('order_status_logs')
                  .insert({
                    transaction_id: txId,
                    state: newState,
                    message: orderData.message || null
                  });
              } catch (e) {
                // ignore if table not exists
              }
            }
          } catch (err) {
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


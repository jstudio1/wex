import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-keys';

const API_URL = 'https://socialtools24hr.com/api/v1';

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const apiKey = await getApiKey('SOCIAL_API_KEY');
  if (!apiKey) return NextResponse.json({ error: 'missing_social_api_key' }, { status: 500 });

  try {
    const body = await req.json();
    const { order_ids } = body;

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json({ error: 'invalid_order_ids' }, { status: 400 });
    }

    const data = new URLSearchParams({
      key: apiKey,
      action: 'status',
      orders: order_ids.join(',')
    });

    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: data
    });

    const responseJson = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json({ error: 'provider_error', detail: responseJson }, { status: 502 });
    }

    // Update database with status
    const sb = createServiceClient();
    const updates: Promise<unknown>[] = [];

    for (const [orderId, orderData] of Object.entries(responseJson)) {
      if (typeof orderData === 'string') {
        // Error message like "Incorrect order ID"
        continue;
      }

      const order = orderData as {
        order: string;
        status: string;
        charge?: string;
        start_count?: string;
        remains?: string;
      };

      updates.push(
        (async () => {
          await sb
            .from('social_orders')
            .update({
              status: order.status,
              charge: order.charge ? Number(order.charge) : null,
              start_count: order.start_count ? Number(order.start_count) : null,
              remains: order.remains ? Number(order.remains) : null,
              updated_at: new Date().toISOString()
            })
            .eq('external_order_id', order.order)
            .eq('user_id', user.id);
        })()
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ ok: true, data: responseJson });
  } catch (error) {
    console.error('social order status error', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-keys';

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { order_ids } = body;

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json({ error: 'invalid_order_ids' }, { status: 400 });
    }

    const sb = createServiceClient();
    
    // ดึง orders ที่เป็นของ user นี้และมี external_order_id
    const { data: orders, error: ordersError } = await sb
      .from('social_orders')
      .select(`
        id,
        external_order_id,
        provider_id,
        social_providers (
          id,
          name,
          api_url,
          api_key_name,
          is_active
        )
      `)
      .eq('user_id', user.id)
      .in('external_order_id', order_ids)
      .not('external_order_id', 'is', null);

    if (ordersError) {
      return NextResponse.json({ error: 'db_error', detail: ordersError.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ ok: true, data: {} });
    }

    // จัดกลุ่ม orders ตาม provider
    const ordersByProvider = new Map<number, typeof orders>();
    for (const order of orders) {
      const provider = Array.isArray(order.social_providers) 
        ? order.social_providers[0] 
        : order.social_providers;
      
      if (!provider || !provider.is_active) continue;
      
      const providerId = provider.id;
      if (!ordersByProvider.has(providerId)) {
        ordersByProvider.set(providerId, []);
      }
      ordersByProvider.get(providerId)!.push(order);
    }

    // อัพเดทสถานะสำหรับแต่ละ provider
    const allUpdates: Promise<unknown>[] = [];
    const allResponses: Record<string, any> = {};

    for (const [providerId, providerOrders] of ordersByProvider.entries()) {
      const firstOrder = providerOrders[0];
      const provider = Array.isArray(firstOrder.social_providers) 
        ? firstOrder.social_providers[0] 
        : firstOrder.social_providers;
      
      if (!provider) continue;

      const apiKey = await getApiKey(provider.api_key_name);
      if (!apiKey) {
        console.error(`Missing API key for provider ${provider.name}`);
        continue;
      }

      const externalOrderIds = providerOrders
        .map(o => o.external_order_id)
        .filter((id): id is string => id !== null);

      if (externalOrderIds.length === 0) continue;

    const data = new URLSearchParams({
      key: apiKey,
      action: 'status',
        orders: externalOrderIds.join(',')
    });

      try {
        const upstream = await fetch(provider.api_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: data
    });

    const responseJson = await upstream.json();

    if (!upstream.ok) {
          console.error(`Provider ${provider.name} status error:`, responseJson);
          continue;
    }

        // รวม response เข้ากับ allResponses
        Object.assign(allResponses, responseJson);

    // Update database with status
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

          allUpdates.push(
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
      } catch (error) {
        console.error(`Error fetching status from provider ${provider.name}:`, error);
        continue;
      }
    }

    await Promise.all(allUpdates);

    return NextResponse.json({ ok: true, data: allResponses });
  } catch (error) {
    console.error('social order status error', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


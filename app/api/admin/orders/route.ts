import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();

  try {
    // ดึง orders ทั้งหมด 5 ประเภท (ไม่รวม game_account)
    const [gtopupOrders, mtopupOrders, cashcardOrders, appPremiumOrders, socialOrders] = await Promise.all([
      // 1. Gtopup orders (เติมเกม)
      sb
        .from('orders')
        .select('id, transaction_id, product_id, item_id, created_at, state, price, user_id, product_type, input_json, result_code')
        .eq('product_type', 'gtopup')
        .order('created_at', { ascending: false })
        .limit(1000),
      
      // 2. Mtopup orders (เติมเงินมือถือ)
      sb
        .from('orders')
        .select('id, transaction_id, product_id, item_id, created_at, state, price, user_id, product_type, input_json, result_code')
        .eq('product_type', 'mtopup')
        .order('created_at', { ascending: false })
        .limit(1000),
      
      // 3. Cashcard orders (บัตรเติมเงิน)
      sb
        .from('orders')
        .select('id, transaction_id, product_id, item_id, created_at, state, price, user_id, product_type, input_json, result_code')
        .eq('product_type', 'cashcard')
        .order('created_at', { ascending: false })
        .limit(1000),
      
      // 4. App Premium orders
      sb
        .from('app_premium_orders')
        .select('id, reference, external_reference, product_id, created_at, status, price, user_id, product_data, raw_response')
        .order('created_at', { ascending: false })
        .limit(1000),
      
      // 5. Social orders
      sb
        .from('social_orders')
        .select('id, external_order_id, social_service_id, created_at, status, price, user_id, link, quantity')
        .order('created_at', { ascending: false })
        .limit(1000),
    ]);

    // Get related data
    const allProductIds = [
      ...new Set([
        ...(gtopupOrders.data || []).map((o: any) => o.product_id).filter(Boolean),
        ...(mtopupOrders.data || []).map((o: any) => o.product_id).filter(Boolean),
        ...(cashcardOrders.data || []).map((o: any) => o.product_id).filter(Boolean),
      ])
    ];
    const appPremiumProductIds = [...new Set((appPremiumOrders.data || []).map((o: any) => o.product_id).filter(Boolean))];
    const socialServiceIds = [...new Set((socialOrders.data || []).map((o: any) => o.social_service_id).filter(Boolean))];
    const userIds = [
      ...new Set([
        ...(gtopupOrders.data || []).map((o: any) => o.user_id).filter(Boolean),
        ...(mtopupOrders.data || []).map((o: any) => o.user_id).filter(Boolean),
        ...(cashcardOrders.data || []).map((o: any) => o.user_id).filter(Boolean),
        ...(appPremiumOrders.data || []).map((o: any) => o.user_id).filter(Boolean),
        ...(socialOrders.data || []).map((o: any) => o.user_id).filter(Boolean),
      ])
    ];

    const [products, appPremiumProducts, socialServices, users] = await Promise.all([
      allProductIds.length > 0
        ? sb.from('products').select('id, name, image_url, key').in('id', allProductIds)
        : Promise.resolve({ data: [] }),
      appPremiumProductIds.length > 0
        ? sb.from('app_premium_products').select('id, display_name, name, image_url, icon_url').in('id', appPremiumProductIds)
        : Promise.resolve({ data: [] }),
      socialServiceIds.length > 0
        ? sb.from('social_services').select('id, display_name, name').in('id', socialServiceIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? sb.from('users').select('id, username').in('id', userIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Create maps
    const productsMap = new Map((products.data || []).map((p: any) => [p.id, p]));
    const appPremiumProductsMap = new Map((appPremiumProducts.data || []).map((p: any) => [p.id, p]));
    const socialServicesMap = new Map((socialServices.data || []).map((ss: any) => [ss.id, ss]));
    const usersMap = new Map((users.data || []).map((u: any) => [u.id, u]));

    // Get order logs for messages (SMS, operator transaction ID, etc.)
    const allTransactionIds = [
      ...(gtopupOrders.data || []).map((o: any) => o.transaction_id).filter(Boolean),
      ...(mtopupOrders.data || []).map((o: any) => o.transaction_id).filter(Boolean),
      ...(cashcardOrders.data || []).map((o: any) => o.transaction_id).filter(Boolean),
    ];
    
    const orderLogsMap = new Map<string, string>();
    if (allTransactionIds.length > 0) {
      const { data: logs } = await sb
        .from('order_status_logs')
        .select('transaction_id, message')
        .in('transaction_id', allTransactionIds)
        .not('message', 'is', null);
      
      if (logs) {
        for (const log of logs) {
          const txId = log.transaction_id as string;
          const message = log.message as string;
          if (txId && message && !orderLogsMap.has(txId)) {
            orderLogsMap.set(txId, message);
          }
        }
      }
    }

    // Format gtopup orders (เติมเกม)
    const formattedGtopupOrders = (gtopupOrders.data || []).map((order: any) => ({
      type: 'gtopup' as const,
      id: order.transaction_id || `gt-${order.id}`,
      transaction_id: order.transaction_id,
      product_id: order.product_id,
      user_id: order.user_id,
      created_at: order.created_at,
      state: order.state,
      price: order.price,
      input_json: order.input_json || null,
      result_code: order.result_code || null,
      result_message: order.transaction_id ? orderLogsMap.get(order.transaction_id) || null : null,
      product: productsMap.get(order.product_id) || null,
      user: usersMap.get(order.user_id) || null,
    }));

    // Format mtopup orders (เติมเงินมือถือ)
    const formattedMtopupOrders = (mtopupOrders.data || []).map((order: any) => ({
      type: 'mtopup' as const,
      id: order.transaction_id || `mt-${order.id}`,
      transaction_id: order.transaction_id,
      product_id: order.product_id,
      user_id: order.user_id,
      created_at: order.created_at,
      state: order.state,
      price: order.price,
      input_json: order.input_json || null,
      result_code: order.result_code || null,
      result_message: order.transaction_id ? orderLogsMap.get(order.transaction_id) || null : null,
      product: productsMap.get(order.product_id) || null,
      user: usersMap.get(order.user_id) || null,
    }));

    // Format cashcard orders (บัตรเติมเงิน)
    const formattedCashcardOrders = (cashcardOrders.data || []).map((order: any) => ({
      type: 'cashcard' as const,
      id: order.transaction_id || `cc-${order.id}`,
      transaction_id: order.transaction_id,
      product_id: order.product_id,
      user_id: order.user_id,
      created_at: order.created_at,
      state: order.state,
      price: order.price,
      input_json: order.input_json || null,
      result_code: order.result_code || null,
      result_message: order.transaction_id ? orderLogsMap.get(order.transaction_id) || null : null,
      product: productsMap.get(order.product_id) || null,
      user: usersMap.get(order.user_id) || null,
    }));

    // Format app premium orders
    const formattedAppPremiumOrders = (appPremiumOrders.data || []).map((order: any) => ({
      type: 'app_premium' as const,
      id: order.reference || order.external_reference || `ap-${order.id}`,
      transaction_id: order.reference || order.external_reference,
      product_id: order.product_id,
      user_id: order.user_id,
      created_at: order.created_at,
      state: order.status,
      price: order.price,
      product_data: order.product_data || null,
      raw_response: order.raw_response || null,
      product: appPremiumProductsMap.get(order.product_id) || null,
      user: usersMap.get(order.user_id) || null,
    }));

    // Format social orders
    const formattedSocialOrders = (socialOrders.data || []).map((order: any) => ({
      type: 'social' as const,
      id: order.external_order_id || `so-${order.id}`,
      transaction_id: order.external_order_id,
      social_service_id: order.social_service_id,
      user_id: order.user_id,
      created_at: order.created_at,
      state: order.status,
      price: order.price,
      link: order.link,
      quantity: order.quantity,
      social_service: socialServicesMap.get(order.social_service_id) || null,
      user: usersMap.get(order.user_id) || null,
    }));

    return NextResponse.json({
      data: {
        gtopup: formattedGtopupOrders,
        mtopup: formattedMtopupOrders,
        cashcard: formattedCashcardOrders,
        app_premium: formattedAppPremiumOrders,
        social: formattedSocialOrders,
        all: [
          ...formattedGtopupOrders,
          ...formattedMtopupOrders,
          ...formattedCashcardOrders,
          ...formattedAppPremiumOrders,
          ...formattedSocialOrders,
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      },
    });
  } catch (error) {
    console.error('Admin orders GET error:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}


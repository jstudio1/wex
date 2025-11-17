import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();

  try {
    // ดึง orders ทั้ง 3 ประเภท
    const [productOrders, gameAccountOrders, socialOrders] = await Promise.all([
      // 1. Product orders (เติมเกม)
      sb
        .from('orders')
        .select('transaction_id, product_id, created_at, state, price, user_id')
        .order('created_at', { ascending: false })
        .limit(1000),
      
      // 2. Game account orders
      sb
        .from('game_account_orders')
        .select('id, transaction_id, game_account_id, created_at, state, price, user_id, username')
        .order('created_at', { ascending: false })
        .limit(1000),
      
      // 3. Social orders
      sb
        .from('social_orders')
        .select('id, external_order_id, social_service_id, created_at, status, price, user_id, link, quantity')
        .order('created_at', { ascending: false })
        .limit(1000),
    ]);

    // Get related data
    const productIds = [...new Set((productOrders.data || []).map((o: any) => o.product_id).filter(Boolean))];
    const gameAccountIds = [...new Set((gameAccountOrders.data || []).map((o: any) => o.game_account_id).filter(Boolean))];
    const socialServiceIds = [...new Set((socialOrders.data || []).map((o: any) => o.social_service_id).filter(Boolean))];
    const userIds = [
      ...new Set([
        ...(productOrders.data || []).map((o: any) => o.user_id).filter(Boolean),
        ...(gameAccountOrders.data || []).map((o: any) => o.user_id).filter(Boolean),
        ...(socialOrders.data || []).map((o: any) => o.user_id).filter(Boolean),
      ])
    ];

    const [products, gameAccounts, socialServices, users] = await Promise.all([
      productIds.length > 0
        ? sb.from('products').select('id, name, image_url, key').in('id', productIds)
        : Promise.resolve({ data: [] }),
      gameAccountIds.length > 0
        ? sb.from('game_accounts').select('id, game_name, title, cover_image_url').in('id', gameAccountIds)
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
    const gameAccountsMap = new Map((gameAccounts.data || []).map((ga: any) => [ga.id, ga]));
    const socialServicesMap = new Map((socialServices.data || []).map((ss: any) => [ss.id, ss]));
    const usersMap = new Map((users.data || []).map((u: any) => [u.id, u]));

    // Format product orders
    const formattedProductOrders = (productOrders.data || []).map((order: any) => ({
      type: 'product' as const,
      id: order.transaction_id,
      transaction_id: order.transaction_id,
      product_id: order.product_id,
      user_id: order.user_id,
      created_at: order.created_at,
      state: order.state,
      price: order.price,
      product: productsMap.get(order.product_id) || null,
      user: usersMap.get(order.user_id) || null,
    }));

    // Format game account orders
    const formattedGameAccountOrders = (gameAccountOrders.data || []).map((order: any) => ({
      type: 'game_account' as const,
      id: order.transaction_id || `ga-${order.id}`,
      transaction_id: order.transaction_id,
      game_account_id: order.game_account_id,
      user_id: order.user_id,
      created_at: order.created_at,
      state: order.state,
      price: order.price,
      username: order.username,
      game_account: gameAccountsMap.get(order.game_account_id) || null,
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
        product: formattedProductOrders,
        game_account: formattedGameAccountOrders,
        social: formattedSocialOrders,
        all: [
          ...formattedProductOrders,
          ...formattedGameAccountOrders,
          ...formattedSocialOrders,
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      },
    });
  } catch (error) {
    console.error('Admin orders GET error:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}


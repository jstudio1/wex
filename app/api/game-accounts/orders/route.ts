import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const sb = createServiceClient();
    
    // First get orders
    const { data: orders, error: ordersError } = await sb
      .from('game_account_orders')
      .select(`
        id,
        transaction_id,
        game_account_id,
        price,
        state,
        username,
        password,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      return NextResponse.json({ error: 'db_error', detail: ordersError.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ ok: true, data: [] });
    }

    // Get unique game_account_ids
    const accountIds = [...new Set(orders.map(o => o.game_account_id).filter(Boolean))];
    
    // Fetch game accounts separately
    let accountsMap = new Map();
    if (accountIds.length > 0) {
      const { data: accounts, error: accountsError } = await sb
        .from('game_accounts')
        .select('id, game_name, title, cover_image_url')
        .in('id', accountIds);

      if (!accountsError && accounts) {
        for (const acc of accounts) {
          accountsMap.set(acc.id, acc);
        }
      }
    }

    // Combine orders with game_accounts data
    const enrichedOrders = orders.map(order => ({
      ...order,
      game_accounts: order.game_account_id ? accountsMap.get(order.game_account_id) || null : null
    }));

    return NextResponse.json({ ok: true, data: enrichedOrders });
  } catch (err) {
    console.error('Game account orders GET error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const sb = createServiceClient();
    
    // First get orders
    const { data: orders, error: ordersError } = await sb
      .from('game_account_orders')
      .select(`
        id,
        transaction_id,
        user_id,
        game_account_id,
        price,
        state,
        username,
        password,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (ordersError) {
      return NextResponse.json({ error: 'db_error', detail: ordersError.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ ok: true, data: [] });
    }

    // Get unique IDs
    const accountIds = [...new Set(orders.map(o => o.game_account_id).filter(Boolean))];
    const userIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];
    
    // Fetch related data separately
    let accountsMap = new Map();
    let usersMap = new Map();
    
    if (accountIds.length > 0) {
      const { data: accounts } = await sb
        .from('game_accounts')
        .select('id, game_name, title, cover_image_url')
        .in('id', accountIds);
      
      if (accounts) {
        for (const acc of accounts) {
          accountsMap.set(acc.id, acc);
        }
      }
    }
    
    if (userIds.length > 0) {
      const { data: users } = await sb
        .from('users')
        .select('id, username')
        .in('id', userIds);
      
      if (users) {
        for (const u of users) {
          usersMap.set(u.id, u);
        }
      }
    }

    // Combine orders with related data
    const enrichedOrders = orders.map(order => ({
      ...order,
      game_accounts: order.game_account_id ? accountsMap.get(order.game_account_id) || null : null,
      users: order.user_id ? usersMap.get(order.user_id) || null : null
    }));

    return NextResponse.json({ ok: true, data: enrichedOrders });
  } catch (err) {
    console.error('Admin game account orders POST error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


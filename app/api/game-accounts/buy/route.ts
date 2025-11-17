import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { logOrderToDiscord } from '@/lib/discord';
import { z } from 'zod';

const buyAccountSchema = z.object({
  game_name: z.string().min(1),
  title: z.string().min(1),
  quantity: z.number().int().min(1).optional().default(1)
});

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validated = buyAccountSchema.parse(body);

    const sb = createServiceClient();

    // Find available accounts (not sold, stock > 0) with matching game_name and base title
    // Get the required number of accounts from the same product group (ordered by created_at ASC)
    const baseTitle = validated.title.split(' #')[0];
    const { data: accounts, error: accountError } = await sb
      .from('game_accounts')
      .select('*')
      .eq('game_name', validated.game_name)
      .like('title', `${baseTitle}%`) // Match titles that start with base title
      .eq('is_published', true)
      .gt('stock', 0)
      .is('sold_at', null)
      .order('created_at', { ascending: true })
      .limit(validated.quantity);

    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json({ 
        error: 'account_not_available', 
        detail: 'ไอดีนี้ไม่พร้อมขายหรือถูกขายไปแล้ว' 
      }, { status: 400 });
    }

    // Check if we have enough stock
    if (accounts.length < validated.quantity) {
      return NextResponse.json({ 
        error: 'insufficient_stock', 
        detail: `สต็อกไม่เพียงพอ (เหลือ ${accounts.length} ชิ้น)` 
      }, { status: 400 });
    }

    const price = Number(accounts[0].price);
    const totalPrice = price * validated.quantity;

    // Check user balance
    const { data: userData, error: userError } = await sb
      .from('users')
      .select('points')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    const userPoints = Number(userData.points || 0);
    if (userPoints < totalPrice) {
      return NextResponse.json({ 
        error: 'insufficient_points', 
        detail: `พอยต์ไม่เพียงพอ (ต้องการ ${totalPrice.toFixed(2)} พอยต์)` 
      }, { status: 400 });
    }

    // Create orders for each account
    const orders = [];
    const now = Date.now();
    
    for (let i = 0; i < validated.quantity; i++) {
      const account = accounts[i];
      const transactionId = `GA_${now}_${i}_${Math.random().toString(36).substring(2, 9)}`;
      
      const { data: order, error: orderError } = await sb
        .from('game_account_orders')
        .insert({
          transaction_id: transactionId,
          user_id: user.id,
          game_account_id: account.id,
          price: price,
          state: 'completed',
          username: account.username,
          password: account.password
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        // Rollback: delete all created orders
        for (const createdOrder of orders) {
          await sb.from('game_account_orders').delete().eq('id', createdOrder.id);
        }
        return NextResponse.json({ 
          error: 'order_creation_failed', 
          detail: orderError.message 
        }, { status: 500 });
      }

      orders.push(order);

      // Update account: mark as sold, reduce stock
      const { error: updateError } = await sb
        .from('game_accounts')
        .update({
          stock: 0,
          sold_at: new Date().toISOString(),
          purchased_order_id: order.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (updateError) {
        console.error('Account update error:', updateError);
        // Rollback: delete all created orders
        for (const createdOrder of orders) {
          await sb.from('game_account_orders').delete().eq('id', createdOrder.id);
        }
        return NextResponse.json({ 
          error: 'account_update_failed', 
          detail: updateError.message 
        }, { status: 500 });
      }
    }

    // Debit points from user (once for all orders)
    const debitRes = await sb.rpc('wallet_debit', { u: user.id, amt: totalPrice });
    if (debitRes.error) {
      console.error('wallet_debit error:', debitRes.error);
      // Rollback: delete all orders and restore accounts
      for (const order of orders) {
        await sb.from('game_account_orders').delete().eq('id', order.id);
        await sb
          .from('game_accounts')
          .update({
            stock: 1,
            sold_at: null,
            purchased_order_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.game_account_id);
      }
      return NextResponse.json({ 
        error: 'payment_failed', 
        detail: 'ไม่สามารถหักพอยต์ได้' 
      }, { status: 500 });
    }

    // Get updated user balance
    const { data: updatedUser } = await sb
      .from('users')
      .select('points')
      .eq('id', user.id)
      .single();

    // ส่ง Discord webhook log
    try {
      // ดึงข้อมูล account เพื่อเอารูปภาพ
      const firstAccount = accounts[0];
      if (firstAccount) {
        await logOrderToDiscord({
          type: 'game-account',
          username: user.username,
          userId: user.id,
          productName: firstAccount.title,
          amount: totalPrice,
          transactionId: orders[0]?.transaction_id,
          status: 'completed',
          imageUrl: firstAccount.cover_image_url,
          additionalInfo: {
            '🎮 เกม': firstAccount.game_name,
            '📦 จำนวน': `${validated.quantity}`,
            '💰 ราคารวม': `${totalPrice.toFixed(2)} พอยต์`,
          }
        });
      }
    } catch (err) {
      console.error('Discord webhook error:', err);
      // ไม่ throw error
    }

    return NextResponse.json({ 
      ok: true, 
      data: {
        orders: orders.map(order => ({
          transaction_id: order.transaction_id,
          price: order.price,
          state: order.state,
          username: order.username,
          password: order.password,
          created_at: order.created_at
        })),
        total_price: totalPrice,
        quantity: validated.quantity,
        balance: Number(updatedUser?.points || 0)
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('Buy game account error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


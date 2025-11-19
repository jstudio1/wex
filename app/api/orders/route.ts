import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-keys';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';
import { logOrderToDiscord } from '@/lib/discord';
import { z } from 'zod';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://x.24payseller.com';

const createOrderSchema = z.object({
  product_key: z.string().min(1),
  item_sku: z.string().min(1),
  input: z.object({
    uid: z.string().min(1),
    server: z.string().optional()
  }),
  webhookURL: z.string().url().optional(),
  coupon_code: z.string().optional()
});

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const sb = createServiceClient();
    const { data: orders, error } = await sb
      .from('orders')
      .select('transaction_id, product_id, created_at, updated_at, finished_at, state, result_code, price, input_json')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    const productIds = Array.from(new Set((orders || []).map((o: any) => o.product_id as number)));
    let productMap = new Map<number, { id: number; name: string; image_url: string | null; key: string }>();
    
    if (productIds.length) {
      const { data: products } = await sb
        .from('products')
        .select('id, name, image_url, key')
        .in('id', productIds);
      for (const p of products || []) {
        productMap.set((p as any).id as number, {
          id: (p as any).id as number,
          name: (p as any).name as string,
          image_url: (p as any).image_url as string | null,
          key: (p as any).key as string
        });
      }
    }

    const ordersWithProducts = (orders || []).map((o: any) => {
      const prod = productMap.get(o.product_id);
      return {
        ...o,
        product: prod || null
      };
    });

    return NextResponse.json({ ok: true, data: ordersWithProducts });
  } catch (error) {
    console.error('orders fetch error', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const API_KEY = await getApiKey('API_KEY_24PAY');
  if (!API_KEY) return NextResponse.json({ error: 'missing_api_key' }, { status: 500 });

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'invalid_payload',
        message: 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง',
        detail: parsed.error.issues 
      }, { status: 400 });
    }

    const { product_key, item_sku, input, webhookURL, coupon_code } = parsed.data;

    const sb = createServiceClient();

    // ดึง product จาก database
    const { data: product, error: productError } = await sb
      .from('products')
      .select('id, name, key, image_url')
      .eq('key', product_key)
      .eq('is_published', true)
      .maybeSingle();

    if (productError) return NextResponse.json({ error: 'db_error', detail: productError.message }, { status: 500 });
    if (!product) return NextResponse.json({ error: 'product_not_found' }, { status: 404 });

    // ดึง item จาก database
    const { data: item, error: itemError } = await sb
      .from('product_items')
      .select('id, name, sku, price')
      .eq('product_id', product.id)
      .eq('sku', item_sku)
      .maybeSingle();

    if (itemError) return NextResponse.json({ error: 'db_error', detail: itemError.message }, { status: 500 });
    if (!item) return NextResponse.json({ error: 'item_not_found' }, { status: 404 });

    const itemPrice = Number(item.price || 0);

    // ตรวจสอบและคำนวณ coupon ถ้ามี
    let finalPrice = itemPrice;
    let couponDiscount = 0;
    if (coupon_code) {
      try {
        const couponRes = await fetch(`${req.url.split('/api/orders')[0]}/api/coupons/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: coupon_code, total_amount: itemPrice })
        });
        if (couponRes.ok) {
          const couponData = await couponRes.json();
          if (couponData.coupon) {
            finalPrice = couponData.coupon.final_amount;
            couponDiscount = itemPrice - finalPrice;
            // อัพเดท used_count ของ coupon
            const { data: currentCoupon } = await sb
              .from('coupons')
              .select('used_count')
              .eq('code', coupon_code)
              .single();
            
            if (currentCoupon) {
              await sb
                .from('coupons')
                .update({ used_count: Number(currentCoupon.used_count || 0) + 1 })
                .eq('code', coupon_code);
            }
          }
        }
      } catch (err) {
        console.error('Coupon validation error:', err);
        // ถ้า validate coupon ไม่ได้ ให้ใช้ราคาเต็ม
      }
    }

    // ตรวจสอบว่า user มี points เพียงพอหรือไม่
    const { data: userData, error: userError } = await sb
      .from('users')
      .select('id, username, points')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'db_error', detail: 'ไม่สามารถตรวจสอบยอดเงินได้' }, { status: 500 });
    }

    const userPoints = Number(userData.points || 0);
    if (userPoints < finalPrice) {
      return NextResponse.json({ 
        error: 'insufficient_funds', 
        detail: `ยอดเงินไม่เพียงพอ (ต้องการ ${finalPrice.toFixed(2)} พอยต์, มี ${userPoints.toFixed(2)} พอยต์)` 
      }, { status: 400 });
    }

    // หัก points จาก wallet (ใช้ finalPrice ที่หัก coupon แล้ว)
    const debitRes = await sb.rpc('wallet_debit', { u: user.id, amt: finalPrice });
    if (debitRes.error || debitRes.data === false || debitRes.data === null) {
      console.error('wallet_debit error:', debitRes.error);
      return NextResponse.json({ error: 'deduct_failed', detail: 'ไม่สามารถหักเงินได้' }, { status: 500 });
    }

    // สร้าง webhook URL ถ้าไม่ได้ระบุ
    const webhookUrl = webhookURL || (process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/orders` : undefined);

    // ส่งไปที่ External API
    const upstreamPayload: any = {
      product_key,
      item_sku,
      input
    };
    if (webhookUrl) {
      upstreamPayload.webhookURL = webhookUrl;
    }

    const upstream = await fetch(`${API_BASE}/agent/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY
      },
      body: JSON.stringify(upstreamPayload)
    });

    const upstreamResponse = await upstream.json();

    // ถ้าส่งไป External API ไม่สำเร็จ ให้คืนเงิน
    if (!upstream.ok || !upstreamResponse.order) {
      console.error('External API error:', {
        status: upstream.status,
        statusText: upstream.statusText,
        response: upstreamResponse
      });
      await sb.rpc('wallet_credit', { u: user.id, amt: finalPrice });
      return NextResponse.json({ 
        error: 'provider_error', 
        detail: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง' 
      }, { status: 502 });
    }

    const upstreamOrder = upstreamResponse.order;
    const transactionId = upstreamOrder.transactionId || upstreamOrder.transaction_id || String(upstreamOrder.order?.id || '');

    // บันทึกออเดอร์ลง database
    const { data: orderInsert, error: insertError } = await sb
      .from('orders')
      .insert({
        transaction_id: transactionId,
        user_id: user.id,
        product_id: product.id,
        item_id: item.id,
        price: finalPrice, // ใช้ finalPrice ที่หัก coupon แล้ว
        state: upstreamOrder.state || 'pending',
        result_code: upstreamOrder.result_code || null,
        input_json: input,
        finished_at: upstreamOrder.finishedAt || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('order insert error:', insertError);
      // ถ้าบันทึกไม่สำเร็จแต่ External API ส่งสำเร็จแล้ว ให้คืนเงิน
      await sb.rpc('wallet_credit', { u: user.id, amt: finalPrice });
      return NextResponse.json({ error: 'db_error', detail: 'ไม่สามารถบันทึกออเดอร์ได้' }, { status: 500 });
    }

    // ดึง user balance ใหม่หลังจากหักเงิน
    const { data: updatedUser } = await sb
      .from('users')
      .select('points')
      .eq('id', user.id)
      .single();

    // ส่ง Discord webhook log
    try {
      await logOrderToDiscord({
        type: 'product',
        username: user.username,
        userId: user.id,
        productName: product.name,
        amount: finalPrice,
        transactionId: transactionId,
        status: upstreamOrder.state || 'pending',
        imageUrl: product.image_url,
        additionalInfo: {
          '📦 สินค้า': item.name,
          '🆔 SKU': item.sku,
        }
      });
    } catch (err) {
      console.error('Discord webhook error:', err);
      // ไม่ throw error
    }

    // บันทึกสถานะเริ่มต้นลง logs (ถ้ามีตาราง)
    try {
      await sb.from('order_status_logs').insert({
        transaction_id: transactionId,
        state: upstreamOrder.state || 'pending',
        message: 'สร้างออเดอร์'
      });
    } catch {}

    // สร้าง response ตาม API documentation
    const response = {
      order: {
        transactionId: transactionId,
        price: String(finalPrice), // ใช้ finalPrice ที่หัก coupon แล้ว
        userId: user.id,
        state: (upstreamOrder.state || 'pending') as 'pending' | 'completed' | 'refunded' | 'failed' | 'processing' | 'confirming',
        result_code: upstreamOrder.result_code || undefined,
        input: {
          uid: input.uid,
          server: input.server
        },
        productMetadata: {
          id: product.id,
          name: product.name,
          key: product.key,
          price: itemPrice, // ราคาเดิมก่อนหัก coupon
          itemId: item.id,
          itemName: item.name,
          itemSku: item.sku
        },
        createdAt: upstreamOrder.createdAt || orderInsert.created_at,
        updatedAt: upstreamOrder.updatedAt || orderInsert.updated_at,
        finishedAt: upstreamOrder.finishedAt || orderInsert.finished_at || undefined,
        user: {
          id: user.id,
          username: userData.username
        }
      },
      user: {
        id: user.id,
        username: userData.username,
        balance: String(updatedUser?.points || 0),
        balance_used: String(finalPrice) // ใช้ finalPrice ที่หัก coupon แล้ว
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('create order error:', error);
    // ถ้า error เกิดจากการเรียก external API ให้แสดงข้อความทั่วไป
    if (error instanceof Error && error.message.includes('fetch')) {
      return NextResponse.json({ 
        error: 'provider_error', 
        detail: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง' 
      }, { status: 502 });
    }
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง' 
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';
import { logOrderToDiscord } from '@/lib/discord';
import { createGtopupOrder, generateDestRef, WepayError } from '@/lib/providers/wepay';
import { z } from 'zod';

const FALLBACK_BASE =
  process.env.WEPAY_WEBHOOK_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

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
    const { searchParams } = new URL(req.url);
    const productType = searchParams.get('product_type') || 'gtopup';
    
    const sb = createServiceClient();
    const { data: orders, error } = await sb
      .from('orders')
      .select('id, transaction_id, product_id, item_id, created_at, updated_at, finished_at, state, result_code, price, input_json')
      .eq('user_id', user.id)
      .eq('product_type', productType)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    const productIds = Array.from(new Set((orders || []).map((o: any) => o.product_id as number)));
    const itemIds = Array.from(new Set((orders || []).map((o: any) => o.item_id).filter((id: any) => id !== null && id !== undefined)));
    
    let productMap = new Map<number, { id: number; name: string; image_url: string | null; key: string }>();
    let itemMap = new Map<number, { id: number; name: string; sku: string }>();
    
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

    if (itemIds.length) {
      const { data: items } = await sb
        .from('product_items')
        .select('id, name, sku')
        .in('id', itemIds);
      for (const item of items || []) {
        itemMap.set((item as any).id as number, {
          id: (item as any).id as number,
          name: (item as any).name as string,
          sku: (item as any).sku as string
        });
      }
    }

    const ordersWithProducts = (orders || [])
      .map((o: any) => {
        const prod = productMap.get(o.product_id);
        const item = o.item_id ? itemMap.get(o.item_id) : null;
        return {
          ...o,
          product: prod || null,
          item: item || null
        };
      })
      .sort((a: any, b: any) => {
        // Primary sort: ใช้ created_at (ใหม่สุดก่อน) เพื่อให้ลำดับคงที่
        const aCreated = new Date(a.created_at || 0).getTime();
        const bCreated = new Date(b.created_at || 0).getTime();
        if (bCreated !== aCreated) {
          return bCreated - aCreated;
        }
        // Secondary sort: ใช้ id เพื่อให้ลำดับคงที่เมื่อวันที่เหมือนกัน (id ใหม่กว่า = มากกว่า)
        return (b.id || 0) - (a.id || 0);
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
      .select('id, name, key, image_url, provider_company_id')
      .eq('key', product_key)
      .eq('is_published', true)
      .maybeSingle();

    if (productError) return NextResponse.json({ error: 'db_error', detail: productError.message }, { status: 500 });
    if (!product) return NextResponse.json({ error: 'product_not_found' }, { status: 404 });

    // ดึง item จาก database
    const { data: item, error: itemError } = await sb
      .from('product_items')
      .select('id, name, sku, price, is_flashsale, flashsale_price, flashsale_max_quantity, flashsale_duration_days, flashsale_start_date')
      .eq('product_id', product.id)
      .eq('sku', item_sku)
      .maybeSingle();

    if (itemError) return NextResponse.json({ error: 'db_error', detail: itemError.message }, { status: 500 });
    if (!item) return NextResponse.json({ error: 'item_not_found' }, { status: 404 });

    // ตรวจสอบ flash sale limits
    if (item.is_flashsale) {
      const now = new Date();
      
      // ตรวจสอบระยะเวลาขาย
      if (item.flashsale_start_date && item.flashsale_duration_days) {
        const startDate = new Date(item.flashsale_start_date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Number(item.flashsale_duration_days));
        
        if (now > endDate) {
          return NextResponse.json({ 
            error: 'flashsale_expired', 
            detail: 'Flash Sale หมดอายุแล้ว' 
          }, { status: 400 });
        }
      }
      
      // ตรวจสอบจำนวนที่เหลือ
      if (item.flashsale_max_quantity) {
        const { data: soldOrders } = await sb
          .from('orders')
          .select('id')
          .eq('item_id', item.id)
          .in('state', ['completed', 'processing', 'pending']);
        
        const quantitySold = (soldOrders || []).length;
        
        if (quantitySold >= Number(item.flashsale_max_quantity)) {
          return NextResponse.json({ 
            error: 'flashsale_sold_out', 
            detail: 'Flash Sale หมดแล้ว' 
          }, { status: 400 });
        }
      }
    }

    // ใช้ flashsale_price ถ้ามี, ไม่งั้นใช้ราคาปกติ
    const itemPrice = item.is_flashsale && item.flashsale_price 
      ? Number(item.flashsale_price) 
      : Number(item.price || 0);

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

    const providerCompanyId = (product as any).provider_company_id || product.key;
    const destRef = generateDestRef('GT');
    const ref1Value = input.server ? `${input.uid.trim()} ${input.server.trim()}` : input.uid.trim();
    const webhookUrl = webhookURL || (FALLBACK_BASE ? `${FALLBACK_BASE.replace(/\/$/, '')}/api/webhooks/wepay` : undefined);

    if (!webhookUrl) {
      await sb.rpc('wallet_credit', { u: user.id, amt: finalPrice });
      return NextResponse.json({
        error: 'missing_webhook',
        detail: 'ระบบยังไม่ได้ตั้งค่า WEPAY_WEBHOOK_URL หรือ NEXT_PUBLIC_BASE_URL',
      }, { status: 500 });
    }

    let upstreamOrder;
    try {
      upstreamOrder = await createGtopupOrder({
        companyId: providerCompanyId,
        amount: itemPrice,
        ref1: ref1Value,
        respUrl: webhookUrl,
        destRef,
      });
    } catch (err) {
      await sb.rpc('wallet_credit', { u: user.id, amt: finalPrice });
      throw err;
    }

    const transactionId = upstreamOrder.transaction_id
      ? String(upstreamOrder.transaction_id)
      : upstreamOrder.transactionId
        ? String(upstreamOrder.transactionId)
        : destRef;

    // บันทึกออเดอร์ลง database
    const { data: orderInsert, error: insertError } = await sb
      .from('orders')
      .insert({
        transaction_id: transactionId,
        user_id: user.id,
        product_id: product.id,
        item_id: item.id,
        price: finalPrice, // ใช้ finalPrice ที่หัก coupon แล้ว
        state: 'processing',
        result_code: upstreamOrder.code === '00000' ? null : (upstreamOrder.code || null),
        input_json: input,
        finished_at: null
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
        status: 'processing',
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
        state: 'processing',
        message: 'สร้างออเดอร์'
      });
    } catch {}

    // สร้าง response ตาม API documentation
    const response = {
      order: {
        transactionId: transactionId,
        price: String(finalPrice), // ใช้ finalPrice ที่หัก coupon แล้ว
        userId: user.id,
        state: 'processing' as 'pending' | 'completed' | 'refunded' | 'failed' | 'processing' | 'confirming',
        result_code: upstreamOrder.code === '00000' ? undefined : upstreamOrder.code,
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
        createdAt: orderInsert.created_at,
        updatedAt: orderInsert.updated_at,
        finishedAt: orderInsert.finished_at || undefined,
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
    if (error instanceof WepayError) {
      return NextResponse.json({ 
        error: 'provider_error', 
        detail: error.message || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง' 
      }, { status: 502 });
    }
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

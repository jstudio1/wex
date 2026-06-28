import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { logOrderToDiscord } from '@/lib/discord';
import { createMtopupOrder, generateDestRef, WepayError } from '@/lib/providers/wepay';
import { validateCoupon } from '@/lib/coupons';
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
    phone_number: z.string().regex(/^0[0-9]{9}$/, 'เบอร์โทรศัพท์ต้องเป็น 10 หลักและขึ้นต้นด้วย 0')
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
      .select('transaction_id, product_id, item_id, created_at, updated_at, finished_at, state, result_code, price, input_json')
      .eq('user_id', user.id)
      .eq('product_type', 'mtopup')
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
        .in('id', productIds)
        .eq('product_type', 'mtopup');
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
        const aDate = new Date(a.updated_at || a.finished_at || a.created_at || 0).getTime();
        const bDate = new Date(b.updated_at || b.finished_at || b.created_at || 0).getTime();
        return bDate - aDate;
      });

    return NextResponse.json({ ok: true, data: ordersWithProducts });
  } catch (error) {
    console.error('mtopup orders fetch error', error);
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
      // Format error messages จาก zod
      const errorMessages = parsed.error.issues.map((issue) => {
        if (issue.path.length > 0) {
          return `${issue.path.join('.')}: ${issue.message}`;
        }
        return issue.message;
      });
      
      return NextResponse.json({ 
        error: 'invalid_payload',
        message: 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง',
        detail: errorMessages.join(', ')
      }, { status: 400 });
    }

    const { product_key, item_sku, input, webhookURL, coupon_code } = parsed.data;

    const sb = createServiceClient();

    // ดึง product จาก database
    const { data: product, error: productError } = await sb
      .from('products')
      .select('id, name, key, image_url, provider_company_id, product_type, badge_enabled, badge_percent, badge_apply_price')
      .eq('key', product_key)
      .eq('is_published', true)
      .eq('product_type', 'mtopup')
      .maybeSingle();

    if (productError) return NextResponse.json({ error: 'db_error', detail: productError.message }, { status: 500 });
    if (!product) return NextResponse.json({ error: 'product_not_found' }, { status: 404 });

    // ดึง item จาก database
    const { data: item, error: itemError } = await sb
      .from('product_items')
      .select('id, name, sku, price, original_price, agent_cost_price, markup_percent, markup_fixed')
      .eq('product_id', product.id)
      .eq('sku', item_sku)
      .maybeSingle();

    if (itemError) return NextResponse.json({ error: 'db_error', detail: itemError.message }, { status: 500 });
    if (!item) return NextResponse.json({ error: 'item_not_found' }, { status: 404 });

    // คำนวณราคาขายสด ให้ตรงกับสูตรเดียวกับที่แสดงผลหน้า user
    // ราคาขาย (item.price) คือราคาขายจริง ไม่บวก Global Markup (ใช้เฉพาะแอพพรีเมียม) และไม่ใช่ราคาทุน
    const agentCost = Number((item as any).agent_cost_price ?? item.price ?? 0);
    const sellBase = Number(item.price ?? agentCost ?? 0);
    const liveComputedPrice = sellBase;

    // ใช้ badge discount เดียวกับที่แสดงผลหน้า user (ต้องเปิด badge_enabled จริงๆ ไม่ใช่แค่ badge_apply_price)
    const badgeEnabled = Boolean((product as any).badge_enabled);
    const badgePercent = Number((product as any).badge_percent ?? 0);
    const applyBadgeDiscount = badgeEnabled && Boolean((product as any).badge_apply_price) && badgePercent > 0;
    const itemPrice = applyBadgeDiscount
      ? Math.max(0, liveComputedPrice * (1 - badgePercent / 100))
      : liveComputedPrice;

    // จำนวนเงินที่แท้จริงที่จะเติม (face value) - ใช้ original_price ถ้ามี, ไม่งั้นใช้ price
    const faceValue = Number((item as any).original_price || item.price || 0);

    // ตรวจสอบและคำนวณ coupon ถ้ามี
    let finalPrice = itemPrice;
    let couponDiscount = 0;
    if (coupon_code) {
      try {
        const couponResult = await validateCoupon(coupon_code, itemPrice);
        if (couponResult.valid && couponResult.coupon) {
          finalPrice = couponResult.coupon.final_amount;
          couponDiscount = itemPrice - finalPrice;
          // อัพเดท used_count ของ coupon
          const { data: currentCoupon } = await sb
            .from('coupons')
            .select('used_count')
            .eq('code', coupon_code.toUpperCase())
            .single();
          
          if (currentCoupon) {
            await sb
              .from('coupons')
              .update({ used_count: Number(currentCoupon.used_count || 0) + 1 })
              .eq('code', coupon_code.toUpperCase());
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
    const destRef = generateDestRef('MT');
    const phoneNumber = input.phone_number.trim();
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
      // ส่ง faceValue (original_price - ราคาแบบไม่หักส่วนลดตัวแทน) ไปที่ wePAY
      // ตามเอกสาร wePAY: pay_to_amount ต้องเป็นจำนวนเงินที่แท้จริงที่จะเติม (ไม่ใช่ราคาหลังหักส่วนลด)
      console.log('[mtopup] Creating wePAY order:', {
        companyId: providerCompanyId,
        faceValue: faceValue, // จำนวนเงินที่จะเติม (original_price)
        itemPrice: itemPrice, // ราคาที่ขาย (ราคาหลังหักส่วนลด)
        original_price: (item as any).original_price,
        price: item.price
      });
      
      upstreamOrder = await createMtopupOrder({
        companyId: providerCompanyId,
        amount: faceValue, // ใช้ original_price (ราคาแบบไม่หักส่วนลดตัวแทน)
        phoneNumber: phoneNumber,
        respUrl: webhookUrl,
        destRef,
      });
      } catch (err) {
        await sb.rpc('wallet_credit', { u: user.id, amt: finalPrice });
        if (err instanceof WepayError && err.code === 'unauthorized') {
          console.error('[mtopup] wePAY authentication error:', err);
          // 401 Access Denied สำหรับ mtopup อาจเกิดจาก:
          // 1. Account ไม่มีสิทธิ์ใช้ mtopup API (ต้องติดต่อ wePAY เพื่อเปิดสิทธิ์)
          // 2. IP whitelist (ngrok URL อาจไม่ได้รับการ whitelist)
          // 3. resp_url validation (wePAY อาจ reject ngrok URLs)
          throw new WepayError('unauthorized', 'ไม่สามารถเข้าถึง wePAY mtopup API ได้ กรุณาตรวจสอบ:\n1. Account มีสิทธิ์ใช้ mtopup API หรือไม่\n2. IP whitelist สำหรับ mtopup\n3. resp_url ต้องเป็น production URL (ไม่ใช่ ngrok)', err.response, err.status);
        }
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
        price: finalPrice,
        state: 'processing',
        result_code: upstreamOrder.code === '00000' ? null : (upstreamOrder.code || null),
        input_json: input,
        finished_at: null,
        product_type: 'mtopup'
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
          '📱 เบอร์โทร': phoneNumber,
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
        price: String(finalPrice),
        userId: user.id,
        state: 'processing' as 'pending' | 'completed' | 'refunded' | 'failed' | 'processing' | 'confirming',
        result_code: upstreamOrder.code === '00000' ? undefined : upstreamOrder.code,
        input: {
          phone_number: input.phone_number
        },
        productMetadata: {
          id: product.id,
          name: product.name,
          key: product.key,
          price: itemPrice,
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
        balance_used: String(finalPrice)
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('create mtopup order error:', error);
    if (error instanceof WepayError) {
      // แสดง error message ที่ชัดเจนขึ้นสำหรับ authentication error
      if (error.code === 'unauthorized') {
        return NextResponse.json({
          error: 'provider_auth_error',
          detail: error.message || 'ไม่สามารถเชื่อมต่อ wePAY mtopup API ได้ กรุณาตรวจสอบสิทธิ์และ IP whitelist',
          wepay_diagnostic: error.diagnostic || null
        }, { status: 502 });
      }
      return NextResponse.json({
        error: 'provider_error',
        detail: error.message || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง',
        wepay_diagnostic: error.diagnostic || null
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


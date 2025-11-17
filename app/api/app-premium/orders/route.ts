import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';
import { logOrderToDiscord } from '@/lib/discord';
import { z } from 'zod';

const API_URL = 'https://otp24hr.com/api/v1';

function getOtp24hrApiKey(): string {
  // ใช้ env variable หรือ fallback to empty string
  return process.env.OTP24HR_API_KEY || '';
}

const createOrderSchema = z.object({
  product_id: z.number().min(1),
  reference: z.string().max(100).optional(),
});

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    // ดึงประวัติจาก database เท่านั้น (เฉพาะของ user นี้)
    console.log(`[App Premium Orders] Fetching orders for user: ${user.id}`);
    return await getOrdersFromDatabase(String(user.id));
  } catch (error) {
    console.error('[App Premium Orders] Fetch error:', error);
    return NextResponse.json({ error: 'unexpected', detail: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 });
  }
}

async function getOrdersFromDatabase(userId: string) {
  try {
    const sb = createServiceClient();
    console.log(`[App Premium Orders] Querying database for user: ${userId}`);
    
    const { data: orders, error } = await sb
      .from('app_premium_orders')
      .select(`
        id,
        reference,
        external_reference,
        product_data,
        price,
        status,
        raw_response,
        created_at,
        updated_at,
        app_premium_products (
          id,
          display_name,
          name,
          image_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[App Premium Orders] Database error:', error);
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    console.log(`[App Premium Orders] Found ${orders?.length || 0} orders for user: ${userId}`);
    return NextResponse.json({ ok: true, data: orders || [] });
  } catch (error) {
    console.error('[App Premium Orders] Database fetch error:', error);
    return NextResponse.json({ error: 'unexpected', detail: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const apiKey = getOtp24hrApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'missing_otp24hr_api_key' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', detail: parsed.error.flatten() }, { status: 400 });
    }

    const { product_id, reference } = parsed.data;
    
    // Generate reference if not provided
    const finalReference = reference?.trim() || `APP_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const sb = createServiceClient();
    const { data: product, error: productError } = await sb
      .from('app_premium_products')
      .select('*')
      .eq('id', product_id)
      .eq('is_published', true)
      .maybeSingle();

    if (productError) return NextResponse.json({ error: 'db_error', detail: productError.message }, { status: 500 });
    if (!product) return NextResponse.json({ error: 'product_not_found' }, { status: 404 });

    // คำนวณราคา
    const { pct: globalPct, fix: globalFix } = await getGlobalMarkup();

    const basePrice = Number(product.base_price || 0);
    const finalPrice = computePrice(
      basePrice,
      Number(product.markup_percent || 0),
      Number(product.markup_fixed || 0),
      globalPct,
      globalFix
    );

    // ตรวจสอบว่า user มี points เพียงพอหรือไม่
    const { data: userData, error: userError } = await sb
      .from('users')
      .select('points')
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

    // หัก points จาก wallet
    const debitRes = await sb.rpc('wallet_debit', { u: user.id, amt: finalPrice });
    if (debitRes.error || debitRes.data === false || debitRes.data === null) {
      console.error('wallet_debit error:', debitRes.error);
      return NextResponse.json({ error: 'deduct_failed', detail: 'ไม่สามารถหักเงินได้' }, { status: 500 });
    }

    // เรียก OTP24HR API (ใช้ form-data ตามเอกสาร)
    const formData = new URLSearchParams();
    formData.append('keyapi', apiKey);
    formData.append('type_code', String(product.provider_product_id));
    formData.append('amount', '1');
    // email เป็น optional ตามตัวอย่าง

    const upstream = await fetch(`${API_URL}?action=buypack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const responseJson = await upstream.json();

    // ถ้า API ล้มเหลว ให้คืน points กลับ
    // OTP24HR response: { status: 'success' | 'error', name, textid, amount, price, total_credit, linkz }
    if (!upstream.ok || responseJson.status !== 'success') {
      await sb.rpc('wallet_credit', { u: user.id, amt: finalPrice });
      // Log error details for debugging แต่ไม่แสดงให้ user
      console.error('OTP24HR API error:', {
        status: upstream.status,
        statusText: upstream.statusText,
        response: responseJson
      });
      return NextResponse.json({ 
        error: 'provider_error', 
        detail: responseJson.msg || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' 
      }, { status: 502 });
    }

    // บันทึก order ลง database
    // OTP24HR response: { status: 'success', name, id, textid, amount, price, total_credit, linkz }
    const otp24hrId = responseJson.id ? String(responseJson.id) : finalReference;
    const { data: orderInsert, error: insertError } = await sb
      .from('app_premium_orders')
      .insert({
        user_id: user.id,
        app_premium_product_id: product.id,
        reference: otp24hrId,
        external_reference: otp24hrId,
        product_data: {
          name: responseJson.name,
          id: responseJson.id,
          textid: responseJson.textid,
          amount: responseJson.amount,
          price: responseJson.price,
          total_credit: responseJson.total_credit,
          linkz: responseJson.linkz
        },
        price: finalPrice,
        status: 'completed',
        raw_response: responseJson
      })
      .select()
      .single();

    if (insertError) {
      console.error('App premium order insert error:', insertError);
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
        type: 'premium-app',
        username: user.username,
        userId: user.id,
        productName: product.display_name || product.name,
        amount: finalPrice,
        reference: finalReference,
        status: 'completed',
        imageUrl: product.image_url,
      });
    } catch (err) {
      console.error('Discord webhook error:', err);
      // ไม่ throw error
    }

    return NextResponse.json({ 
      ok: true, 
      order: {
        id: orderInsert.id,
        reference: orderInsert.reference,
        product_data: orderInsert.product_data,
        price: finalPrice,
        status: orderInsert.status,
        created_at: orderInsert.created_at
      },
      user: {
        id: user.id,
        balance: String(updatedUser?.points || 0),
        balance_used: String(finalPrice)
      }
    });
  } catch (error) {
    console.error('App premium order error:', error);
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง' 
    }, { status: 500 });
  }
}


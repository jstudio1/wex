import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-keys';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';
import { logOrderToDiscord } from '@/lib/discord';
import { z } from 'zod';

const API_URL = 'https://api.peamsub24hr.com/v2/cashcard';

const createOrderSchema = z.object({
  product_id: z.number().min(1),
  reference: z.string().max(100).optional(),
});

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const sb = createServiceClient();
    const { data: orders, error } = await sb
      .from('cashcard_orders')
      .select(`
        id,
        reference,
        product_data,
        price,
        status,
        raw_response,
        created_at,
        updated_at,
        cashcard_products (
          id,
          display_name,
          name,
          image_url,
          category
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: orders || [] });
  } catch (error) {
    console.error('Cashcard orders fetch error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const apiKey = await getApiKey('peamsubapi');
  if (!apiKey) return NextResponse.json({ error: 'missing_peamsub_api_key' }, { status: 500 });

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', detail: parsed.error.flatten() }, { status: 400 });
    }

    const { product_id, reference } = parsed.data;
    
    // Generate reference if not provided
    const finalReference = reference?.trim() || `CASH_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const sb = createServiceClient();
    const { data: product, error: productError } = await sb
      .from('cashcard_products')
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

    // Encode API key ด้วย Base64
    const encodedKey = Buffer.from(apiKey).toString('base64');

    // เรียก Peamsub API
    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: product.provider_product_id,
        reference: finalReference
      })
    });

    const responseJson = await upstream.json();

    // ถ้า API ล้มเหลว ให้คืน points กลับ
    if (!upstream.ok || responseJson.statusCode !== 200) {
      await sb.rpc('wallet_credit', { u: user.id, amt: finalPrice });
      // Log error details for debugging แต่ไม่แสดงให้ user
      console.error('Peamsub API error:', {
        status: upstream.status,
        statusText: upstream.statusText,
        response: responseJson
      });
      return NextResponse.json({ 
        error: 'provider_error', 
        detail: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' 
      }, { status: 502 });
    }

    // สำหรับ cashcard การซื้อจะใช้เวลา 1-2 นาที จึงตั้ง status เป็น pending
    // บันทึก order ลง database
    const { data: orderInsert, error: insertError } = await sb
      .from('cashcard_orders')
      .insert({
        user_id: user.id,
        product_id: product.id,
        provider_product_id: product.provider_product_id,
        reference: finalReference,
        price: finalPrice,
        status: 'pending',
        product_data: null,
        raw_response: responseJson
      })
      .select()
      .single();

    if (insertError) {
      console.error('Cashcard order insert error:', insertError);
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
        type: 'cashcard',
        username: user.username,
        userId: user.id,
        productName: product.display_name || product.name,
        amount: finalPrice,
        reference: finalReference,
        status: 'pending',
        imageUrl: product.image_url,
        additionalInfo: {
          '📂 หมวดหมู่': product.category || '-',
        }
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
        price: finalPrice,
        status: orderInsert.status,
        created_at: orderInsert.created_at
      },
      user: {
        id: user.id,
        balance: String(updatedUser?.points || 0),
        balance_used: String(finalPrice)
      },
      message: 'โปรดรอ 1-2 นาที เพื่อให้การดำเนินการซื้อบัตรเงินสดเสร็จสิ้น'
    });
  } catch (error) {
    console.error('Cashcard order error:', error);
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง' 
    }, { status: 500 });
  }
}


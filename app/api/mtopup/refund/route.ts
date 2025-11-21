import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { createMtopupRefund, generateDestRef, WepayError } from '@/lib/providers/wepay';
import { z } from 'zod';

const FALLBACK_BASE =
  process.env.WEPAY_WEBHOOK_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

const refundSchema = z.object({
  transaction_id: z.string().min(1),
  new_msisdn: z.string().regex(/^0[0-9]{9}$/, 'เบอร์โทรศัพท์ต้องเป็น 10 หลักและขึ้นต้นด้วย 0').optional(),
});

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: 'invalid_payload',
        message: 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง',
        detail: parsed.error.issues
      }, { status: 400 });
    }

    const { transaction_id, new_msisdn } = parsed.data;

    const sb = createServiceClient();

    // ดึง order จาก database
    const { data: order, error: orderError } = await sb
      .from('orders')
      .select('id, transaction_id, product_id, user_id, state, created_at, product_type, input_json')
      .eq('transaction_id', transaction_id)
      .eq('user_id', user.id)
      .eq('product_type', 'mtopup')
      .maybeSingle();

    if (orderError) {
      return NextResponse.json({ error: 'db_error', detail: orderError.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'order_not_found', detail: 'ไม่พบรายการนี้' }, { status: 404 });
    }

    // ตรวจสอบว่า order สำเร็จแล้วหรือไม่ (ต้องสำเร็จก่อนถึงจะ refund ได้)
    if (order.state !== 'completed') {
      return NextResponse.json({
        error: 'invalid_order_state',
        detail: `ไม่สามารถดึงเงินคืนได้ เนื่องจากสถานะรายการเป็น: ${order.state}`
      }, { status: 400 });
    }

    // ตรวจสอบว่าทำภายใน 2 วันหรือไม่
    const orderDate = new Date(order.created_at);
    const now = new Date();
    const daysDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 2) {
      return NextResponse.json({
        error: 'refund_expired',
        detail: 'ไม่สามารถดึงเงินคืนได้ เนื่องจากเกิน 2 วันแล้ว'
      }, { status: 400 });
    }

    // ตรวจสอบว่ามี refund อยู่แล้วหรือไม่
    const { data: existingRefund } = await sb
      .from('order_refunds')
      .select('id, state')
      .eq('transaction_id', transaction_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingRefund) {
      return NextResponse.json({
        error: 'refund_exists',
        detail: 'มีการขอคืนเงินสำหรับรายการนี้แล้ว',
        refund_id: existingRefund.id
      }, { status: 400 });
    }

    // ดึง product เพื่อหา company_id
    const { data: product, error: productError } = await sb
      .from('products')
      .select('provider_company_id, key')
      .eq('id', order.product_id)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: 'db_error', detail: 'ไม่พบข้อมูลสินค้า' }, { status: 500 });
    }

    const providerCompanyId = (product as any).provider_company_id || product.key;
    const destRef = generateDestRef('RF');
    const webhookUrl = FALLBACK_BASE ? `${FALLBACK_BASE.replace(/\/$/, '')}/api/webhooks/wepay/refund` : undefined;

    if (!webhookUrl) {
      return NextResponse.json({
        error: 'missing_webhook',
        detail: 'ระบบยังไม่ได้ตั้งค่า WEPAY_WEBHOOK_URL หรือ NEXT_PUBLIC_BASE_URL',
      }, { status: 500 });
    }

    let refundResponse;
    try {
      refundResponse = await createMtopupRefund({
        transactionId: transaction_id,
        companyId: providerCompanyId,
        respUrl: webhookUrl,
        destRef,
        newMsisdn: new_msisdn,
      });
    } catch (err) {
      if (err instanceof WepayError) {
        return NextResponse.json({
          error: 'provider_error',
          detail: err.message || 'เกิดข้อผิดพลาดจาก wePAY'
        }, { status: 502 });
      }
      throw err;
    }

    // บันทึก refund ลง database
    const { data: refundInsert, error: insertError } = await sb
      .from('order_refunds')
      .insert({
        transaction_id: transaction_id,
        user_id: user.id,
        order_id: order.id,
        refund_id: refundResponse.refund_id ? String(refundResponse.refund_id) : null,
        dest_ref: destRef,
        state: 'pending',
        new_msisdn: new_msisdn || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('refund insert error:', insertError);
      return NextResponse.json({ error: 'db_error', detail: 'ไม่สามารถบันทึกการขอคืนเงินได้' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      refund: {
        id: refundInsert.id,
        transaction_id: transaction_id,
        refund_id: refundResponse.refund_id,
        dest_ref: destRef,
        state: 'pending',
        created_at: refundInsert.created_at,
      }
    });
  } catch (error) {
    console.error('create mtopup refund error:', error);
    if (error instanceof WepayError) {
      return NextResponse.json({
        error: 'provider_error',
        detail: error.message || 'เกิดข้อผิดพลาดจาก wePAY'
      }, { status: 502 });
    }
    return NextResponse.json({
      error: 'unexpected',
      detail: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง'
    }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const validateSchema = z.object({
  code: z.string().min(1),
  total_amount: z.number().positive(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const { code, total_amount } = parsed.data;
    const sb = createServiceClient();

    // ดึงข้อมูลคูปอง
    const { data: coupon, error } = await sb
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return NextResponse.json({ error: 'coupon_not_found', message: 'ไม่พบคูปองนี้' }, { status: 404 });
    }

    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = new Date(coupon.valid_until);

    // ตรวจสอบวันหมดอายุ
    if (now < validFrom) {
      return NextResponse.json({ 
        error: 'coupon_not_started', 
        message: `คูปองนี้ยังไม่เปิดใช้งาน เริ่มใช้ได้วันที่ ${validFrom.toLocaleDateString('th-TH')}` 
      }, { status: 400 });
    }

    if (now > validUntil) {
      return NextResponse.json({ 
        error: 'coupon_expired', 
        message: 'คูปองนี้หมดอายุแล้ว' 
      }, { status: 400 });
    }

    // ตรวจสอบจำนวนครั้งที่ใช้
    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      return NextResponse.json({ 
        error: 'coupon_limit_reached', 
        message: 'คูปองนี้ถูกใช้ครบจำนวนแล้ว' 
      }, { status: 400 });
    }

    // ตรวจสอบยอดซื้อขั้นต่ำ
    if (coupon.min_purchase !== null && total_amount < Number(coupon.min_purchase)) {
      return NextResponse.json({ 
        error: 'min_purchase_not_met', 
        message: `ต้องซื้อขั้นต่ำ ${Number(coupon.min_purchase).toFixed(2)} ฿ ถึงจะใช้คูปองนี้ได้` 
      }, { status: 400 });
    }

    // คำนวณส่วนลด
    let discount = 0;
    if (coupon.discount_type === 'percent') {
      discount = (total_amount * Number(coupon.discount_value)) / 100;
      // ตรวจสอบส่วนลดขั้นต่ำ (สำหรับ percent)
      if (coupon.min_discount !== null && discount < Number(coupon.min_discount)) {
        discount = Number(coupon.min_discount);
      }
    } else {
      // fixed
      discount = Number(coupon.discount_value);
    }

    // ส่วนลดต้องไม่เกินยอดซื้อ
    if (discount > total_amount) {
      discount = total_amount;
    }

    const final_amount = Math.max(0, total_amount - discount);

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: Number(coupon.discount_value),
        discount_amount: discount,
        final_amount: final_amount,
      },
    });
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


import { createServiceClient } from '@/lib/supabase';

type CouponValidationResult = {
  valid: boolean;
  coupon?: {
    id: number;
    code: string;
    discount_type: string;
    discount_value: number;
    discount_amount: number;
    final_amount: number;
  };
  error?: string;
  message?: string;
};

export async function validateCoupon(
  code: string,
  total_amount: number
): Promise<CouponValidationResult> {
  try {
    if (!code || !total_amount || total_amount <= 0) {
      return {
        valid: false,
        error: 'invalid_payload',
        message: 'ข้อมูลไม่ถูกต้อง'
      };
    }

    const sb = createServiceClient();

    // ดึงข้อมูลคูปอง
    const { data: coupon, error } = await sb
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return {
        valid: false,
        error: 'coupon_not_found',
        message: 'ไม่พบคูปองนี้'
      };
    }

    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = new Date(coupon.valid_until);

    // ตรวจสอบวันหมดอายุ
    if (now < validFrom) {
      return {
        valid: false,
        error: 'coupon_not_started',
        message: `คูปองนี้ยังไม่เปิดใช้งาน เริ่มใช้ได้วันที่ ${validFrom.toLocaleDateString('th-TH')}`
      };
    }

    if (now > validUntil) {
      return {
        valid: false,
        error: 'coupon_expired',
        message: 'คูปองนี้หมดอายุแล้ว'
      };
    }

    // ตรวจสอบจำนวนครั้งที่ใช้
    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      return {
        valid: false,
        error: 'coupon_limit_reached',
        message: 'คูปองนี้ถูกใช้ครบจำนวนแล้ว'
      };
    }

    // ตรวจสอบยอดซื้อขั้นต่ำ
    if (coupon.min_purchase !== null && total_amount < Number(coupon.min_purchase)) {
      return {
        valid: false,
        error: 'min_purchase_not_met',
        message: `ต้องซื้อขั้นต่ำ ${Number(coupon.min_purchase).toFixed(2)} ฿ ถึงจะใช้คูปองนี้ได้`
      };
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

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: Number(coupon.discount_value),
        discount_amount: discount,
        final_amount: final_amount,
      },
    };
  } catch (error) {
    console.error('Coupon validation error:', error);
    return {
      valid: false,
      error: 'unexpected',
      message: 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
    };
  }
}


import { createServiceClient } from './supabase';

export async function getGlobalMarkup() {
  const sb = createServiceClient();
  const { data, error } = await sb.from('settings').select('key, value').in('key', ['PRICING_MARKUP_PERCENT', 'PRICING_MARKUP_FIXED']);
  if (error) {
    console.error('[getGlobalMarkup] Error fetching settings:', error);
    // Return default values on error
    return { pct: 0, fix: 0 };
  }
  const map = new Map<string, string>();
  for (const row of data || []) map.set(row.key as string, row.value as string);
  const pct = Number(map.get('PRICING_MARKUP_PERCENT') || '0');
  const fix = Number(map.get('PRICING_MARKUP_FIXED') || '0');
  return { pct, fix };
}

export function computePrice(base: number, itemPct = 0, itemFix = 0, globalPct = 0, globalFix = 0) {
  const withItem = base * (1 + itemPct / 100) + itemFix;
  const withGlobal = withItem * (1 + globalPct / 100) + globalFix;
  return Math.max(0, withGlobal);
}

export type Permission = {
  discount_percent: number;
  discount_amount: number;
  discount_cap_amount: number;
} | null;

/**
 * คำนวณราคาหลังส่วนลดจากสิทธิ์
 * @param originalPrice ราคาเดิม
 * @param permission สิทธิ์ส่วนลด (null ถ้าไม่มีสิทธิ์)
 * @param productPermissionId permission_id ของสินค้า (null ถ้าไม่มี)
 * @param userPermissionId permission_id ของผู้ใช้ (null ถ้าไม่มี)
 * @returns ราคาหลังส่วนลด
 */
export function applyPermissionDiscount(
  originalPrice: number, 
  permission: Permission | null,
  productPermissionId: number | null = null,
  userPermissionId: number | null = null
): number {
  // ถ้าสินค้ามี permission_id ต้องเช็คว่า user มี permission ที่ตรงกันหรือไม่
  if (productPermissionId !== null) {
    // ถ้า user ไม่มี permission หรือ permission ไม่ตรงกับสินค้า ไม่ลด
    if (!userPermissionId || userPermissionId !== productPermissionId) {
      return originalPrice;
    }
  }

  // ถ้าไม่มี permission หรือสินค้าไม่มี permission_id แต่ user มี permission (ใช้สิทธิ์ทั่วไป)
  if (!permission) {
    return originalPrice;
  }

  let discountedPrice = originalPrice;

  // คำนวณส่วนลดเป็นเปอร์เซ็นต์
  if (permission.discount_percent > 0) {
    const percentDiscount = (originalPrice * permission.discount_percent) / 100;
    // จำกัดส่วนลดไม่เกิน discount_cap_amount (ถ้ามี)
    const finalPercentDiscount = permission.discount_cap_amount > 0
      ? Math.min(percentDiscount, permission.discount_cap_amount)
      : percentDiscount;
    discountedPrice = originalPrice - finalPercentDiscount;
  }

  // คำนวณส่วนลดเป็นจำนวนเงินคงที่
  if (permission.discount_amount > 0) {
    discountedPrice = discountedPrice - permission.discount_amount;
  }

  // ราคาต้องไม่ต่ำกว่า 0
  return Math.max(0, discountedPrice);
}




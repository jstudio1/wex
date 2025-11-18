import { describe, it, expect } from 'vitest';
import { computePrice, applyPermissionDiscount, type Permission } from '../pricing';

describe('computePrice', () => {
  it('ควรคำนวณราคาโดยไม่มี markup', () => {
    expect(computePrice(100)).toBe(100);
  });

  it('ควรคำนวณราคาโดยมี item markup percent เท่านั้น', () => {
    expect(computePrice(100, 10)).toBeCloseTo(110, 2); // 100 * 1.1
  });

  it('ควรคำนวณราคาโดยมี item markup fixed เท่านั้น', () => {
    expect(computePrice(100, 0, 5)).toBe(105); // 100 + 5
  });

  it('ควรคำนวณราคาโดยมีทั้ง item และ global markup', () => {
    // base: 100, item: +10%, global: +5%
    // step 1: 100 * 1.1 = 110
    // step 2: 110 * 1.05 = 115.5
    expect(computePrice(100, 10, 0, 5, 0)).toBeCloseTo(115.5, 2);
  });

  it('ควรคำนวณราคาโดยมีทั้ง percent และ fixed markup', () => {
    // base: 100, item: +10% +5, global: +5% +2
    // step 1: 100 * 1.1 + 5 = 115
    // step 2: 115 * 1.05 + 2 = 122.75
    expect(computePrice(100, 10, 5, 5, 2)).toBeCloseTo(122.75, 2);
  });

  it('ควรไม่ให้ราคาติดลบ', () => {
    expect(computePrice(10, 0, 0, 0, -100)).toBe(0);
  });

  it('ควรจัดการกับราคา 0', () => {
    expect(computePrice(0)).toBe(0);
    expect(computePrice(0, 10, 5)).toBe(5); // 0 * 1.1 + 5 = 5
  });
});

describe('applyPermissionDiscount', () => {
  const permission: Permission = {
    discount_percent: 10,
    discount_amount: 5,
    discount_cap_amount: 20,
  };

  it('ควรคืนราคาเดิมถ้าไม่มี permission', () => {
    expect(applyPermissionDiscount(100, null)).toBe(100);
  });

  it('ควรคำนวณส่วนลดเป็นเปอร์เซ็นต์', () => {
    const perm: Permission = { discount_percent: 10, discount_amount: 0, discount_cap_amount: 0 };
    expect(applyPermissionDiscount(100, perm)).toBe(90); // 100 - 10
  });

  it('ควรคำนวณส่วนลดเป็นจำนวนเงินคงที่', () => {
    const perm: Permission = { discount_percent: 0, discount_amount: 5, discount_cap_amount: 0 };
    expect(applyPermissionDiscount(100, perm)).toBe(95); // 100 - 5
  });

  it('ควรคำนวณส่วนลดทั้ง percent และ amount', () => {
    // 100 - (100 * 0.1) - 5 = 85
    expect(applyPermissionDiscount(100, permission)).toBe(85);
  });

  it('ควรจำกัดส่วนลดไม่เกิน discount_cap_amount', () => {
    const perm: Permission = { discount_percent: 50, discount_amount: 0, discount_cap_amount: 20 };
    // 100 * 0.5 = 50 แต่จำกัดที่ 20
    expect(applyPermissionDiscount(100, perm)).toBe(80); // 100 - 20
  });

  it('ควรไม่ให้ราคาติดลบ', () => {
    const perm: Permission = { discount_percent: 0, discount_amount: 150, discount_cap_amount: 0 };
    expect(applyPermissionDiscount(100, perm)).toBe(0);
  });

  it('ควรคืนราคาเดิมถ้าสินค้ามี permission_id แต่ user ไม่มี permission', () => {
    expect(applyPermissionDiscount(100, permission, 1, null)).toBe(100);
  });

  it('ควรคืนราคาเดิมถ้า permission_id ไม่ตรงกัน', () => {
    expect(applyPermissionDiscount(100, permission, 1, 2)).toBe(100);
  });

  it('ควรให้ส่วนลดถ้า permission_id ตรงกัน', () => {
    expect(applyPermissionDiscount(100, permission, 1, 1)).toBe(85);
  });

  it('ควรให้ส่วนลดถ้าสินค้าไม่มี permission_id แต่ user มี permission', () => {
    expect(applyPermissionDiscount(100, permission, null, 1)).toBe(85);
  });

  it('ควรจัดการกับราคา 0', () => {
    expect(applyPermissionDiscount(0, permission)).toBe(0);
  });
});


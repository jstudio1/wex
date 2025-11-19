import { describe, expect, it } from 'vitest';
import { applyPermissionDiscount } from './pricing';

const mockPermission = (overrides: Partial<NonNullable<Parameters<typeof applyPermissionDiscount>[1]>> = {}) => ({
  discount_percent: 0,
  discount_amount: 0,
  discount_cap_amount: 0,
  ...overrides,
});

describe('applyPermissionDiscount', () => {
  it('returns original price when no permission', () => {
    expect(applyPermissionDiscount(1000, null)).toBe(1000);
  });

  it('applies percentage discount with cap', () => {
    const permission = mockPermission({ discount_percent: 50, discount_cap_amount: 200 });
    expect(applyPermissionDiscount(1000, permission)).toBe(800);
  });

  it('applies fixed amount discount', () => {
    const permission = mockPermission({ discount_amount: 150 });
    expect(applyPermissionDiscount(1000, permission)).toBe(850);
  });

  it('requires matching product permission id', () => {
    const permission = mockPermission({ discount_amount: 100 });
    expect(applyPermissionDiscount(1000, permission, 2, 1)).toBe(1000);
    expect(applyPermissionDiscount(1000, permission, 2, 2)).toBe(900);
  });
});


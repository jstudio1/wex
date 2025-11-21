import { describe, it, expect } from 'vitest';
import { normalizeNavbarOrder } from '../navbar';

describe('normalizeNavbarOrder', () => {
  it('ควรคืนค่า default order เมื่อไม่มี input', () => {
    const result = normalizeNavbarOrder(undefined);
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it('ควรคืนค่า default order เมื่อ input เป็น null', () => {
    const result = normalizeNavbarOrder(null);
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it('ควรคืนค่า default order เมื่อ input เป็น array ว่าง', () => {
    const result = normalizeNavbarOrder([]);
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it('ควรคืนค่าตาม order ที่กำหนดและเพิ่ม items ที่ขาดหายไป', () => {
    const customOrder = ['home', 'products', 'mtopup'];
    const result = normalizeNavbarOrder(customOrder);
    // ควรมี home, products, mtopup ตาม order ที่กำหนด
    expect(result[0]).toBe('home');
    expect(result).toContain('products');
    expect(result).toContain('mtopup');
    // ควรมี items อื่นๆ จาก default order ด้วย
    expect(result.length).toBeGreaterThan(3);
  });

  it('ควรกรอง invalid items ออก', () => {
    const customOrder = ['home', 'invalid-item', 'products'];
    const result = normalizeNavbarOrder(customOrder);
    expect(result).toContain('home');
    expect(result).toContain('products');
    expect(result).not.toContain('invalid-item');
  });

  it('ควรเพิ่ม default items ที่ขาดหายไป', () => {
    const customOrder = ['home', 'products'];
    const result = normalizeNavbarOrder(customOrder);
    // ควรมี home และ products อยู่
    expect(result).toContain('home');
    expect(result).toContain('products');
    // ควรมี items อื่นๆ จาก default order ด้วย
    expect(result.length).toBeGreaterThan(2);
  });
});


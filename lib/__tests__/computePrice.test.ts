import { describe, it, expect } from 'vitest';
import { computePrice } from '../pricing';

describe('computePrice', () => {
  it('ควรคำนวณราคาได้ถูกต้องเมื่อไม่มี markup', () => {
    expect(computePrice(100)).toBe(100);
  });

  it('ควรคำนวณราคาได้ถูกต้องเมื่อมี item markup percent', () => {
    // 100 * (1 + 10/100) = 110
    expect(computePrice(100, 10)).toBeCloseTo(110, 5);
  });

  it('ควรคำนวณราคาได้ถูกต้องเมื่อมี item markup fixed', () => {
    // 100 + 20 = 120
    expect(computePrice(100, 0, 20)).toBe(120);
  });

  it('ควรคำนวณราคาได้ถูกต้องเมื่อมี item markup ทั้ง percent และ fixed', () => {
    // (100 * 1.1) + 20 = 130
    expect(computePrice(100, 10, 20)).toBe(130);
  });

  it('ควรคำนวณราคาได้ถูกต้องเมื่อมี global markup percent', () => {
    // 100 * (1 + 5/100) = 105
    expect(computePrice(100, 0, 0, 5)).toBe(105);
  });

  it('ควรคำนวณราคาได้ถูกต้องเมื่อมี global markup fixed', () => {
    // 100 + 15 = 115
    expect(computePrice(100, 0, 0, 0, 15)).toBe(115);
  });

  it('ควรคำนวณราคาได้ถูกต้องเมื่อมี markup ทั้งหมด', () => {
    // ((100 * 1.1) + 20) * 1.05 + 15 = 151.5
    // withItem = 100 * 1.1 + 20 = 130
    // withGlobal = 130 * 1.05 + 15 = 136.5 + 15 = 151.5
    expect(computePrice(100, 10, 20, 5, 15)).toBeCloseTo(151.5, 5);
  });

  it('ควรไม่ให้ราคาติดลบ', () => {
    expect(computePrice(100, 0, 0, 0, -200)).toBe(0);
  });

  it('ควรจัดการกับราคา 0', () => {
    expect(computePrice(0)).toBe(0);
    expect(computePrice(0, 10, 20)).toBe(20);
  });

  it('ควรจัดการกับราคาทศนิยม', () => {
    expect(computePrice(99.99, 5)).toBeCloseTo(104.9895, 4);
  });
});


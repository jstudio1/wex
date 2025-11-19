import { describe, it, expect } from 'vitest';

describe('Menu Order Logic', () => {
  const DEFAULT_MENU_ORDER = ['home', 'products', 'premiumApp', 'social', 'blog', 'tools', 'contact'] as const;
  const validKeys = ['home', 'products', 'premiumApp', 'social', 'blog', 'tools', 'contact'];

  function processMenuOrder(currentOrder: string[]): string[] {
    const defaultOrder = ['home', 'products', 'premiumApp', 'social', 'blog', 'tools', 'contact'];
    const order = currentOrder.length > 0 ? currentOrder : defaultOrder;
    
    // Ensure 'home' is always first
    const orderedKeys = order.includes('home') 
      ? ['home', ...order.filter(key => key !== 'home' && validKeys.includes(key))]
      : ['home', ...validKeys.filter(key => key !== 'home')];
    
    return orderedKeys;
  }

  it('ควร ensure home อยู่แรกเสมอแม้ว่าจะไม่ใช่ตัวแรกใน order', () => {
    const currentOrder = ['products', 'social', 'home', 'blog'];
    const result = processMenuOrder(currentOrder);
    
    expect(result[0]).toBe('home');
    expect(result).toContain('products');
    expect(result).toContain('social');
    expect(result).toContain('blog');
  });

  it('ควรเพิ่ม home อัตโนมัติถ้าไม่มีใน order', () => {
    const currentOrder = ['products', 'social', 'blog'];
    const result = processMenuOrder(currentOrder);
    
    expect(result[0]).toBe('home');
    expect(result).toContain('products');
    expect(result).toContain('social');
    expect(result).toContain('blog');
  });

  it('ควรใช้ defaultOrder เมื่อ currentOrder ว่าง', () => {
    const currentOrder: string[] = [];
    const result = processMenuOrder(currentOrder);
    
    expect(result[0]).toBe('home');
    expect(result.length).toBeGreaterThan(0);
  });

  it('ควร filter out keys ที่ไม่ถูกต้อง', () => {
    const currentOrder = ['home', 'products', 'invalid_key', 'social'];
    const result = processMenuOrder(currentOrder);
    
    expect(result[0]).toBe('home');
    expect(result).not.toContain('invalid_key');
    expect(result).toContain('products');
    expect(result).toContain('social');
  });

  it('ควรเรียงลำดับตาม order ที่กำหนด', () => {
    const currentOrder = ['home', 'blog', 'products', 'social'];
    const result = processMenuOrder(currentOrder);
    
    expect(result[0]).toBe('home');
    expect(result.indexOf('blog')).toBeLessThan(result.indexOf('products'));
    expect(result.indexOf('products')).toBeLessThan(result.indexOf('social'));
  });
});


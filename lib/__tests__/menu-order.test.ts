import { describe, it, expect } from 'vitest';

describe('Menu Order Logic', () => {
  const defaultOrder = ['home', 'premiumApp', 'social', 'products', 'mtopup', 'cashcard', 'categories', 'blog', 'contact'];
  const validKeys = [...defaultOrder];

  it('should ensure home is always first', () => {
    const order = ['products', 'home', 'blog', 'contact'];
    const orderedKeys = order.includes('home') 
      ? ['home', ...order.filter(key => key !== 'home' && validKeys.includes(key))]
      : ['home', ...validKeys.filter(key => key !== 'home')];
    
    expect(orderedKeys[0]).toBe('home');
  });

  it('should handle empty order and use default', () => {
    const order: string[] = [];
    const processedOrder = order.length > 0 ? order : defaultOrder;
    const orderedKeys = processedOrder.includes('home') 
      ? ['home', ...processedOrder.filter(key => key !== 'home' && validKeys.includes(key))]
      : ['home', ...validKeys.filter(key => key !== 'home')];
    
    expect(orderedKeys[0]).toBe('home');
    expect(orderedKeys).toEqual(defaultOrder);
  });

  it('should filter out invalid keys', () => {
    const order = ['home', 'products', 'invalid', 'blog', 'contact'];
    const orderedKeys = order.includes('home') 
      ? ['home', ...order.filter(key => key !== 'home' && validKeys.includes(key))]
      : ['home', ...validKeys.filter(key => key !== 'home')];
    
    expect(orderedKeys).not.toContain('invalid');
    expect(orderedKeys[0]).toBe('home');
  });

  it('should preserve order after home', () => {
    const order = ['products', 'blog', 'social'];
    const orderedKeys = ['home', ...order.filter(key => validKeys.includes(key))];
    
    expect(orderedKeys).toEqual(['home', 'products', 'blog', 'social']);
  });

  it('should handle custom order from database', () => {
    const customOrder = ['blog', 'products', 'home'];
    const orderedKeys = customOrder.includes('home') 
      ? ['home', ...customOrder.filter(key => key !== 'home' && validKeys.includes(key))]
      : ['home', ...validKeys.filter(key => key !== 'home')];
    
    expect(orderedKeys[0]).toBe('home');
    expect(orderedKeys).toContain('blog');
    expect(orderedKeys).toContain('products');
  });
});


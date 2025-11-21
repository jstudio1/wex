import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

// Helper function to create a mock query builder
const createMockQueryBuilder = (data: any[] = [], error: any = null) => {
  const builder = {
    data,
    error,
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
  };
  return builder;
};

vi.mock('@/lib/supabase', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'orders') {
        return createMockQueryBuilder([], null);
      }
      if (table === 'products' || table === 'product_items') {
        return createMockQueryBuilder([], null);
      }
      return createMockQueryBuilder([], null);
    }),
  })),
}));

describe('Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ควร return orders เมื่อ user login แล้ว', async () => {
    const { getAuthUser } = await import('@/lib/auth');
    const { createServiceClient } = await import('@/lib/supabase');
    
    vi.mocked(getAuthUser).mockResolvedValue({ id: 1, username: 'test' });
    
    // Mock orders query
    const mockOrdersBuilder = createMockQueryBuilder([
      { id: 1, transaction_id: 'test-123', product_id: 1, item_id: 1, created_at: new Date().toISOString(), state: 'finished', price: 100 }
    ], null);
    
    // Mock products query
    const mockProductsBuilder = createMockQueryBuilder([
      { id: 1, name: 'Test Product', image_url: null, key: 'test-product' }
    ], null);
    
    // Mock items query
    const mockItemsBuilder = createMockQueryBuilder([
      { id: 1, name: 'Test Item', sku: 'test-sku' }
    ], null);
    
    const mockSb = vi.mocked(createServiceClient)();
    vi.mocked(mockSb.from).mockImplementation((table: string) => {
      if (table === 'orders') return mockOrdersBuilder as any;
      if (table === 'products') return mockProductsBuilder as any;
      if (table === 'product_items') return mockItemsBuilder as any;
      return createMockQueryBuilder() as any;
    });

    const { GET } = await import('@/app/api/orders/route');
    const request = new NextRequest('http://localhost:3000/api/orders');
    
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Response structure คือ { ok: true, data: [...] }
    expect(data).toHaveProperty('ok');
    expect(data.ok).toBe(true);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('ควร return 401 เมื่อ user ไม่ได้ login', async () => {
    const { getAuthUser } = await import('@/lib/auth');
    vi.mocked(getAuthUser).mockResolvedValue(null);

    const { GET } = await import('@/app/api/orders/route');
    const request = new NextRequest('http://localhost:3000/api/orders');
    
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});


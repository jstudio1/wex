import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/admin', () => ({
  requireAdmin: vi.fn(),
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
    from: vi.fn((table: string) => createMockQueryBuilder([], null)),
    rpc: vi.fn(() => ({
      data: null,
      error: null,
    })),
  })),
}));

describe('Admin Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ควร return stats เมื่อ admin login แล้ว', async () => {
    const { requireAdmin } = await import('@/lib/admin');
    const { createServiceClient } = await import('@/lib/supabase');
    
    // @ts-ignore
    vi.mocked(requireAdmin).mockResolvedValue({ id: 1, username: 'admin', is_admin: true });
    
    // Mock all query builders to return empty arrays (stats will be 0)
    const mockSb = vi.mocked(createServiceClient)();
    vi.mocked(mockSb.from).mockReturnValue(createMockQueryBuilder([], null) as any);
    // @ts-ignore
    vi.mocked(mockSb.rpc).mockResolvedValue({ data: null, error: null });

    // @ts-ignore
    const { GET } = await import('@/app/api/admin/stats/route');
    const request = new NextRequest('http://localhost:3000/api/admin/stats');
    
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('totalRevenue');
    expect(data).toHaveProperty('revenueThisMonth');
    expect(data).toHaveProperty('orders');
    expect(data).toHaveProperty('revenueByType');
    expect(data).toHaveProperty('ordersByType');
  });

  it('ควร return 401 เมื่อไม่ใช่ admin', async () => {
    const { requireAdmin } = await import('@/lib/admin');
    vi.mocked(requireAdmin).mockResolvedValue(null);

    // @ts-ignore
    const { GET } = await import('@/app/api/admin/stats/route');
    const request = new NextRequest('http://localhost:3000/api/admin/stats');
    
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});


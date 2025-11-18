import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../users/route';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

vi.mock('@/lib/admin');
vi.mock('@/lib/supabase');

describe('GET /api/admin/users', () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any);
  });

  it('ควรคืน 401 ถ้าไม่มี admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('unauthorized');
  });

  it('ควรคืนข้อมูล users พร้อม permission null', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 1, username: 'admin' });

    const mockUsers = [
      { id: 1, username: 'user1', points: 100, created_at: '2024-01-01', is_admin: false },
      { id: 2, username: 'user2', points: 200, created_at: '2024-01-02', is_admin: false },
    ];

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(2);
    expect(data.data[0]).toEqual({ ...mockUsers[0], permission: null });
    expect(data.data[1]).toEqual({ ...mockUsers[1], permission: null });
  });

  it('ควรคืน 500 ถ้ามี database error', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 1, username: 'admin' });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('db_error');
  });

  it('ควรคืน array ว่างถ้าไม่มี users', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 1, username: 'admin' });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
  });
});


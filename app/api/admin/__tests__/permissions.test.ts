import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../permissions/route';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

vi.mock('@/lib/admin');
vi.mock('@/lib/supabase');

describe('GET /api/admin/permissions', () => {
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

  it('ควรคืนข้อมูล permissions', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 1, username: 'admin' });

    const mockPermissions = [
      { id: 1, name: 'VIP', description: 'VIP Member', discount_percent: 10, discount_amount: 0, discount_cap_amount: 0, created_at: '2024-01-01' },
    ];

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);
    mockQuery.order.mockResolvedValue({ data: mockPermissions, error: null });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(mockPermissions);
  });

  it('ควรคืน array ว่างถ้า table ไม่มี', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 1, username: 'admin' });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);
    mockQuery.order.mockResolvedValue({ 
      data: null, 
      error: { code: 'PGRST205', message: 'Table does not exist' } 
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
  });

  it('ควรคืน 500 ถ้ามี database error', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 1, username: 'admin' });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);
    mockQuery.order.mockResolvedValue({ 
      data: null, 
      error: { code: 'OTHER_ERROR', message: 'Database error' } 
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('db_error');
  });
});

describe('POST /api/admin/permissions', () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any);
  });

  it('ควรคืน 401 ถ้าไม่มี admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);

    const req = new Request('http://localhost/api/admin/permissions', {
      method: 'POST',
      body: JSON.stringify({ name: 'VIP', discount_percent: 10, discount_amount: 0, discount_cap_amount: 0 }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('unauthorized');
  });

  it('ควรสร้าง permission ใหม่', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 1, username: 'admin' });

    const newPermission = {
      id: 1,
      name: 'VIP',
      description: 'VIP Member',
      discount_percent: 10,
      discount_amount: 5,
      discount_cap_amount: 20,
    };

    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newPermission, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const req = new Request('http://localhost/api/admin/permissions', {
      method: 'POST',
      body: JSON.stringify({
        name: 'VIP',
        description: 'VIP Member',
        discount_percent: 10,
        discount_amount: 5,
        discount_cap_amount: 20,
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(newPermission);
  });

  it('ควรคืน 400 ถ้า payload ไม่ถูกต้อง', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 1, username: 'admin' });

    const req = new Request('http://localhost/api/admin/permissions', {
      method: 'POST',
      body: JSON.stringify({
        name: '', // invalid: min length 1
        discount_percent: -1, // invalid: min 0
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('invalid_payload');
    expect(data.details).toBeDefined();
  });

  it('ควรคืน 409 ถ้าชื่อซ้ำ', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 1, username: 'admin' });

    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: null, 
        error: { code: '23505', message: 'Duplicate key' } 
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const req = new Request('http://localhost/api/admin/permissions', {
      method: 'POST',
      body: JSON.stringify({
        name: 'VIP',
        discount_percent: 10,
        discount_amount: 0,
        discount_cap_amount: 0,
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('ชื่อสิทธิ์ซ้ำ');
  });

  it('ควร trim whitespace จาก name และ description', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 1, username: 'admin' });

    const newPermission = {
      id: 1,
      name: 'VIP',
      description: 'VIP Member',
      discount_percent: 10,
      discount_amount: 0,
      discount_cap_amount: 0,
    };

    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newPermission, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const req = new Request('http://localhost/api/admin/permissions', {
      method: 'POST',
      body: JSON.stringify({
        name: '  VIP  ',
        description: '  VIP Member  ',
        discount_percent: 10,
        discount_amount: 0,
        discount_cap_amount: 0,
      }),
    });

    await POST(req);

    expect(mockQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'VIP',
        description: 'VIP Member',
      })
    );
  });
});


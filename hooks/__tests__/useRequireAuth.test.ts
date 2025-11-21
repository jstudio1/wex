import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRequireAuth } from '../useRequireAuth';

const mockOpenLoginDialog = vi.fn();

// Mock AuthDialogContext
vi.mock('@/contexts/AuthDialogContext', () => ({
  useAuthDialog: () => ({
    openLoginDialog: mockOpenLoginDialog,
    openRegisterDialog: vi.fn(),
  }),
}));

describe('useRequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ควร return object ที่มี requireAuth function', () => {
    const { result } = renderHook(() => useRequireAuth());
    expect(result.current).toHaveProperty('requireAuth');
    expect(typeof result.current.requireAuth).toBe('function');
  });

  it('ควรเรียก openLoginDialog เมื่อ API return 401', async () => {
    const { result } = renderHook(() => useRequireAuth());
    const { requireAuth } = result.current;
    
    // Mock API response ที่ return 401
    const mockApiCall = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    
    const response = await requireAuth(mockApiCall);
    
    expect(response).toBeNull();
    expect(mockOpenLoginDialog).toHaveBeenCalledTimes(1);
  });

  it('ควร return response เมื่อ API return success', async () => {
    const { result } = renderHook(() => useRequireAuth());
    const { requireAuth } = result.current;
    
    const mockResponse = new Response(JSON.stringify({ data: 'success' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
    const mockApiCall = vi.fn().mockResolvedValue(mockResponse);
    
    const response = await requireAuth(mockApiCall);
    
    expect(response).toBe(mockResponse);
    expect(mockOpenLoginDialog).not.toHaveBeenCalled();
  });

  it('ควร throw error เมื่อ API call fail', async () => {
    const { result } = renderHook(() => useRequireAuth());
    const { requireAuth } = result.current;
    
    const mockError = new Error('Network error');
    const mockApiCall = vi.fn().mockRejectedValue(mockError);
    
    await expect(requireAuth(mockApiCall)).rejects.toThrow('Network error');
    expect(mockOpenLoginDialog).not.toHaveBeenCalled();
  });
});


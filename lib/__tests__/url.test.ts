import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('getBaseUrl', () => {
  const originalEnv = process.env;
  const originalWindow = global.window;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete (global as any).window;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.window = originalWindow;
  });

  it('ควร return window.location.origin เมื่ออยู่ใน browser', async () => {
    global.window = {
      location: { origin: 'https://example.com' }
    } as any;
    
    // ต้อง reload module เพื่อให้ getBaseUrl ใช้ window
    const { getBaseUrl } = await import('../url');
    const url = getBaseUrl();
    expect(url).toBe('https://example.com');
  });

  it('ควร return string ที่ถูกต้องเมื่อไม่มี window', async () => {
    delete (global as any).window;
    
    const { getBaseUrl } = await import('../url');
    const url = getBaseUrl();
    
    // เนื่องจาก FALLBACK_BASE_URL ถูก evaluate ตอน module load
    // เราสามารถ test ได้แค่ว่า return string ที่ถูกต้อง
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
    // ควรเป็น URL format
    expect(url).toMatch(/^https?:\/\//);
  });

  it('ควรจัดการกับ headers() ที่ throw error', async () => {
    delete (global as any).window;
    
    // Mock headers() to throw
    vi.doMock('next/headers', () => ({
      headers: vi.fn(() => {
        throw new Error('No request context');
      })
    }));

    const { getBaseUrl } = await import('../url');
    const url = getBaseUrl();
    
    // ควร fallback ไปใช้ FALLBACK_BASE_URL
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });

  it('ควร return URL ที่ถูกต้อง format', async () => {
    delete (global as any).window;
    
    const { getBaseUrl } = await import('../url');
    const url = getBaseUrl();
    
    // ตรวจสอบว่าเป็น valid URL format
    expect(url).toMatch(/^https?:\/\/.+/);
    try {
      new URL(url);
    } catch {
      expect.fail('URL should be valid');
    }
  });
});


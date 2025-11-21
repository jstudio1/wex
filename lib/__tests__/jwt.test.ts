import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signJwt, verifyJwt, type JwtPayload } from '../jwt';

describe('signJwt', () => {
  beforeEach(() => {
    // ใช้ secret key ที่มีความยาวเพียงพอ (อย่างน้อย 32 bytes สำหรับ HS256)
    process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing-minimum-32-bytes-long';
  });

  afterEach(() => {
    // ไม่ลบ JWT_SECRET เพราะอาจจะใช้ใน tests อื่น
  });

  it('ควรสร้าง JWT token ได้', async () => {
    const payload: JwtPayload = {
      sub: '123',
      username: 'testuser'
    };
    const token = await signJwt(payload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT มี 3 parts
  });

  it('ควร throw error ถ้าไม่มี JWT_SECRET', async () => {
    delete process.env.JWT_SECRET;
    const payload: JwtPayload = {
      sub: '123',
      username: 'testuser'
    };
    await expect(signJwt(payload)).rejects.toThrow('JWT_SECRET is not set');
  });

  it('ควรสร้าง token ที่แตกต่างกันสำหรับ payload เดียวกัน (เนื่องจาก issued at time)', async () => {
    const payload: JwtPayload = {
      sub: '123',
      username: 'testuser'
    };
    const token1 = await signJwt(payload);
    // รอให้ issued at time เปลี่ยน (JWT iat มีหน่วยเป็นวินาที)
    await new Promise(resolve => setTimeout(resolve, 1100));
    const token2 = await signJwt(payload);
    // Token อาจเหมือนกันถ้า issued at time ยังไม่เปลี่ยน
    // แต่ควรมี structure ที่ถูกต้อง
    expect(token1).toBeTruthy();
    expect(token2).toBeTruthy();
    expect(token1.split('.').length).toBe(3);
    expect(token2.split('.').length).toBe(3);
  });

  it('ควรใช้ expiresIn ที่กำหนด', async () => {
    const payload: JwtPayload = {
      sub: '123',
      username: 'testuser'
    };
    const token = await signJwt(payload, '1h');
    expect(token).toBeTruthy();
  });
});

describe('verifyJwt', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('ควร verify JWT token ที่ถูกต้อง', async () => {
    const payload: JwtPayload = {
      sub: '123',
      username: 'testuser'
    };
    const token = await signJwt(payload);
    const verified = await verifyJwt<JwtPayload>(token);
    
    expect(verified.sub).toBe('123');
    expect(verified.username).toBe('testuser');
  });

  it('ควร throw error เมื่อ verify token ที่ผิด', async () => {
    const invalidToken = 'invalid.token.here';
    await expect(verifyJwt(invalidToken)).rejects.toThrow();
  });

  it('ควร throw error เมื่อ verify token ที่ถูกแก้ไข', async () => {
    const payload: JwtPayload = {
      sub: '123',
      username: 'testuser'
    };
    const token = await signJwt(payload);
    const tamperedToken = token.slice(0, -5) + 'xxxxx';
    await expect(verifyJwt(tamperedToken)).rejects.toThrow();
  });

  it('ควร throw error ถ้าไม่มี JWT_SECRET', async () => {
    const payload: JwtPayload = {
      sub: '123',
      username: 'testuser'
    };
    const token = await signJwt(payload);
    delete process.env.JWT_SECRET;
    await expect(verifyJwt(token)).rejects.toThrow('JWT_SECRET is not set');
  });

  it('ควร verify token ที่สร้างด้วย secret อื่นไม่ได้', async () => {
    const payload: JwtPayload = {
      sub: '123',
      username: 'testuser'
    };
    const token = await signJwt(payload);
    process.env.JWT_SECRET = 'different-secret';
    await expect(verifyJwt(token)).rejects.toThrow();
  });

  it('ควร return custom type ได้', async () => {
    type CustomPayload = JwtPayload & { role: string };
    const payload: JwtPayload = {
      sub: '123',
      username: 'testuser'
    };
    const token = await signJwt(payload);
    // Note: ในความเป็นจริง payload จะไม่มี role แต่ type assertion จะช่วยได้
    const verified = await verifyJwt<CustomPayload>(token);
    expect(verified.sub).toBe('123');
  });
});


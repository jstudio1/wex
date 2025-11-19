import { describe, it, expect } from 'vitest';
import { loginSchema } from '../validators';

describe('Login Schema Validation', () => {
  it('ควรรับ usernameOrEmail ที่ถูกต้อง', () => {
    const validData = {
      usernameOrEmail: 'testuser',
      password: 'password123',
    };
    
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('ควรรับ email ใน usernameOrEmail', () => {
    const validData = {
      usernameOrEmail: 'test@example.com',
      password: 'password123',
    };
    
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('ควร reject เมื่อไม่มี usernameOrEmail', () => {
    const invalidData = {
      password: 'password123',
    };
    
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('ควร reject เมื่อ usernameOrEmail สั้นเกินไป', () => {
    const invalidData = {
      usernameOrEmail: 'ab',
      password: 'password123',
    };
    
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('ควร reject เมื่อ password สั้นเกินไป', () => {
    const invalidData = {
      usernameOrEmail: 'testuser',
      password: '12345',
    };
    
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('ควรรับ recaptchaToken ที่ optional', () => {
    const validData = {
      usernameOrEmail: 'testuser',
      password: 'password123',
      recaptchaToken: 'token123',
    };
    
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('ควรรับข้อมูลที่ไม่มี recaptchaToken', () => {
    const validData = {
      usernameOrEmail: 'testuser',
      password: 'password123',
    };
    
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});


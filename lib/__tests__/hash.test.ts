import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../hash';

describe('hashPassword', () => {
  it('ควรสร้าง hash ที่แตกต่างกันสำหรับ password เดียวกัน', async () => {
    const password = 'testpassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    // hash ควรแตกต่างกันเพราะ salt ต่างกัน
    expect(hash1).not.toBe(hash2);
    expect(hash1).toBeTruthy();
    expect(hash2).toBeTruthy();
  });

  it('ควรสร้าง hash ที่มีความยาวมากกว่า 50 ตัวอักษร', async () => {
    const hash = await hashPassword('testpassword');
    expect(hash.length).toBeGreaterThan(50);
  });

  it('ควรจัดการกับ password ที่ว่าง', async () => {
    const hash = await hashPassword('');
    expect(hash).toBeTruthy();
    expect(hash.length).toBeGreaterThan(0);
  });

  it('ควรจัดการกับ password ที่ยาวมาก', async () => {
    const longPassword = 'a'.repeat(1000);
    const hash = await hashPassword(longPassword);
    expect(hash).toBeTruthy();
  });
});

describe('verifyPassword', () => {
  it('ควร verify password ที่ถูกต้อง', async () => {
    const password = 'testpassword123';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('ควร reject password ที่ผิด', async () => {
    const password = 'testpassword123';
    const wrongPassword = 'wrongpassword';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });

  it('ควร reject เมื่อ hash ไม่ถูกต้อง', async () => {
    const password = 'testpassword123';
    const invalidHash = 'invalid.hash.string';
    const isValid = await verifyPassword(password, invalidHash);
    expect(isValid).toBe(false);
  });

  it('ควรจัดการกับ password ที่ว่าง', async () => {
    const hash = await hashPassword('');
    const isValid = await verifyPassword('', hash);
    expect(isValid).toBe(true);
  });

  it('ควร reject password ที่ว่างกับ hash ที่ไม่ตรงกัน', async () => {
    const hash = await hashPassword('somepassword');
    const isValid = await verifyPassword('', hash);
    expect(isValid).toBe(false);
  });
});


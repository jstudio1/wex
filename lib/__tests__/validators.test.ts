import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  createOrderSchema,
  createSocialOrderSchema
} from '../validators';

describe('loginSchema', () => {
  it('ควร validate login data ที่ถูกต้อง', () => {
    const validData = {
      usernameOrEmail: 'testuser',
      password: 'password123'
    };
    expect(() => loginSchema.parse(validData)).not.toThrow();
  });

  it('ควร validate login data พร้อม recaptchaToken', () => {
    const validData = {
      usernameOrEmail: 'testuser',
      password: 'password123',
      recaptchaToken: 'token123'
    };
    expect(() => loginSchema.parse(validData)).not.toThrow();
  });

  it('ควร reject username ที่สั้นเกินไป', () => {
    const invalidData = {
      usernameOrEmail: 'ab',
      password: 'password123'
    };
    expect(() => loginSchema.parse(invalidData)).toThrow();
  });

  it('ควร reject password ที่สั้นเกินไป', () => {
    const invalidData = {
      usernameOrEmail: 'testuser',
      password: '12345'
    };
    expect(() => loginSchema.parse(invalidData)).toThrow();
  });

  it('ควร reject เมื่อไม่มี username', () => {
    const invalidData = {
      password: 'password123'
    };
    expect(() => loginSchema.parse(invalidData)).toThrow();
  });

  it('ควร reject เมื่อไม่มี password', () => {
    const invalidData = {
      usernameOrEmail: 'testuser'
    };
    expect(() => loginSchema.parse(invalidData)).toThrow();
  });
});

describe('registerSchema', () => {
  it('ควร validate register data ที่ถูกต้อง', () => {
    const validData = {
      username: 'newuser',
      password: 'password123',
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      email: 'user@example.com',
      phone: '0812345678'
    };
    expect(() => registerSchema.parse(validData)).not.toThrow();
  });

  it('ควร validate register data พร้อม recaptchaToken', () => {
    const validData = {
      username: 'newuser',
      password: 'password123',
      firstName: 'สมหญิง',
      lastName: 'ใจดี',
      email: 'user@example.com',
      phone: '0812345678',
      recaptchaToken: 'token123'
    };
    expect(() => registerSchema.parse(validData)).not.toThrow();
  });

  it('ควร reject username ที่สั้นเกินไป', () => {
    const invalidData = {
      username: 'ab',
      password: 'password123',
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      email: 'user@example.com'
    };
    expect(() => registerSchema.parse(invalidData)).toThrow();
  });

  it('ควร reject password ที่สั้นเกินไป', () => {
    const invalidData = {
      username: 'newuser',
      password: '12345',
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      email: 'user@example.com'
    };
    expect(() => registerSchema.parse(invalidData)).toThrow();
  });
});

describe('createOrderSchema', () => {
  it('ควร validate order data ที่ถูกต้อง', () => {
    const validData = {
      product_key: 'product123',
      item_sku: 'sku123',
      input: {
        uid: 'user123'
      }
    };
    expect(() => createOrderSchema.parse(validData)).not.toThrow();
  });

  it('ควร validate order data พร้อม server', () => {
    const validData = {
      product_key: 'product123',
      item_sku: 'sku123',
      input: {
        uid: 'user123',
        server: 'server1'
      }
    };
    expect(() => createOrderSchema.parse(validData)).not.toThrow();
  });

  it('ควร validate order data พร้อม webhookURL', () => {
    const validData = {
      product_key: 'product123',
      item_sku: 'sku123',
      input: {
        uid: 'user123'
      },
      webhookURL: 'https://example.com/webhook'
    };
    expect(() => createOrderSchema.parse(validData)).not.toThrow();
  });

  it('ควร reject เมื่อไม่มี product_key', () => {
    const invalidData = {
      item_sku: 'sku123',
      input: { uid: 'user123' }
    };
    expect(() => createOrderSchema.parse(invalidData)).toThrow();
  });

  it('ควร reject เมื่อไม่มี item_sku', () => {
    const invalidData = {
      product_key: 'product123',
      input: { uid: 'user123' }
    };
    expect(() => createOrderSchema.parse(invalidData)).toThrow();
  });

  it('ควร reject เมื่อไม่มี input.uid', () => {
    const invalidData = {
      product_key: 'product123',
      item_sku: 'sku123',
      input: {}
    };
    expect(() => createOrderSchema.parse(invalidData)).toThrow();
  });

  it('ควร reject webhookURL ที่ไม่ใช่ URL', () => {
    const invalidData = {
      product_key: 'product123',
      item_sku: 'sku123',
      input: { uid: 'user123' },
      webhookURL: 'not-a-url'
    };
    expect(() => createOrderSchema.parse(invalidData)).toThrow();
  });
});

describe('createSocialOrderSchema', () => {
  it('ควร validate social order data ที่ถูกต้อง', () => {
    const validData = {
      service_id: 1,
      link: 'https://example.com/post',
      quantity: 100
    };
    expect(() => createSocialOrderSchema.parse(validData)).not.toThrow();
  });

  it('ควร validate social order data พร้อม runs', () => {
    const validData = {
      service_id: 1,
      link: 'https://example.com/post',
      quantity: 100,
      runs: 5
    };
    expect(() => createSocialOrderSchema.parse(validData)).not.toThrow();
  });

  it('ควร validate social order data พร้อม interval', () => {
    const validData = {
      service_id: 1,
      link: 'https://example.com/post',
      quantity: 100,
      interval: 60
    };
    expect(() => createSocialOrderSchema.parse(validData)).not.toThrow();
  });

  it('ควร reject service_id ที่ไม่ใช่ positive integer', () => {
    const invalidData = {
      service_id: 0,
      link: 'https://example.com/post',
      quantity: 100
    };
    expect(() => createSocialOrderSchema.parse(invalidData)).toThrow();
  });

  it('ควร reject link ที่สั้นเกินไป', () => {
    const invalidData = {
      service_id: 1,
      link: 'ab',
      quantity: 100
    };
    expect(() => createSocialOrderSchema.parse(invalidData)).toThrow();
  });

  it('ควร reject quantity ที่ไม่ใช่ positive integer', () => {
    const invalidData = {
      service_id: 1,
      link: 'https://example.com/post',
      quantity: 0
    };
    expect(() => createSocialOrderSchema.parse(invalidData)).toThrow();
  });

  it('ควร reject runs ที่เกิน 1000', () => {
    const invalidData = {
      service_id: 1,
      link: 'https://example.com/post',
      quantity: 100,
      runs: 1001
    };
    expect(() => createSocialOrderSchema.parse(invalidData)).toThrow();
  });

  it('ควร reject interval ที่เกิน 1440', () => {
    const invalidData = {
      service_id: 1,
      link: 'https://example.com/post',
      quantity: 100,
      interval: 1441
    };
    expect(() => createSocialOrderSchema.parse(invalidData)).toThrow();
  });
});


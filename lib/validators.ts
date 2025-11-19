import { z } from 'zod';

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(3), // รองรับทั้ง username และ email
  password: z.string().min(6),
  recaptchaToken: z.string().optional()
});

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().min(10).max(20).optional(),
  recaptchaToken: z.string().optional()
});

export const createOrderSchema = z.object({
  product_key: z.string().min(1),
  item_sku: z.string().min(1),
  input: z.object({
    uid: z.string().min(1),
    server: z.string().optional()
  }),
  webhookURL: z.string().url().optional()
});

export const createSocialOrderSchema = z.object({
  service_id: z.number().int().positive(),
  link: z.string().min(3),
  quantity: z.number().int().positive(),
  runs: z.number().int().positive().max(1000).optional(),
  interval: z.number().int().positive().max(1440).optional()
});




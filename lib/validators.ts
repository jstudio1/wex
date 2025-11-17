import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

export const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
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




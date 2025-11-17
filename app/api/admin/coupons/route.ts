import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const couponSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i, 'โค้ดต้องเป็นตัวอักษร ตัวเลข หรือ _ - เท่านั้น'),
  discount_type: z.enum(['percent', 'fixed']),
  discount_value: z.number().positive(),
  min_discount: z.number().positive().nullable().optional(),
  min_purchase: z.number().positive().nullable().optional(),
  valid_from: z.string().datetime(),
  valid_until: z.string().datetime(),
  usage_limit: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', details: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;

    // ตรวจสอบว่า valid_until ต้องมากกว่า valid_from
    if (new Date(data.valid_until) <= new Date(data.valid_from)) {
      return NextResponse.json({ error: 'invalid_date_range' }, { status: 400 });
    }

    // ตรวจสอบว่า min_discount ต้องมีเฉพาะเมื่อ discount_type = percent
    if (data.discount_type === 'percent' && data.discount_value > 100) {
      return NextResponse.json({ error: 'percent_exceeds_100' }, { status: 400 });
    }

    const sb = createServiceClient();

    // ตรวจสอบว่า code ซ้ำหรือไม่
    const { data: existing } = await sb
      .from('coupons')
      .select('id')
      .eq('code', data.code.toUpperCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'code_taken' }, { status: 409 });
    }

    const { data: newCoupon, error } = await sb
      .from('coupons')
      .insert({
        code: data.code.toUpperCase(),
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_discount: data.min_discount || null,
        min_purchase: data.min_purchase || null,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        usage_limit: data.usage_limit || null,
        is_active: data.is_active ?? true,
        description: data.description || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: newCoupon });
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


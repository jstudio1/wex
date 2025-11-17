import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const redeemCodeSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i, 'โค้ดต้องเป็นตัวอักษร ตัวเลข หรือ _ - เท่านั้น'),
  points: z.number().int().positive(),
  usage_limit: z.number().int().positive().nullable().optional(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('redeem_codes')
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
    const parsed = redeemCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', details: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    const sb = createServiceClient();

    // ตรวจสอบว่า code ซ้ำหรือไม่
    const { data: existing } = await sb
      .from('redeem_codes')
      .select('id')
      .eq('code', data.code.toUpperCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'code_taken' }, { status: 409 });
    }

    const { data: newCode, error } = await sb
      .from('redeem_codes')
      .insert({
        code: data.code.toUpperCase(),
        points: data.points,
        usage_limit: data.usage_limit || null,
        valid_from: data.valid_from ? new Date(data.valid_from).toISOString() : new Date().toISOString(),
        valid_until: data.valid_until ? new Date(data.valid_until).toISOString() : null,
        is_active: data.is_active ?? true,
        description: data.description || null,
        created_by: admin.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: newCode });
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


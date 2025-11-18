import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const numeric = (min: number, max?: number) =>
  z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed.length) return 0;
        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? trimmed : parsed;
      }
      return val;
    },
    max !== undefined ? z.number().min(min).max(max) : z.number().min(min)
  );

const permissionSchema = z.object({
  name: z.string().min(1).max(150),
  description: z
    .preprocess((val) => (typeof val === 'string' ? val.trim() : val), z.string().max(500))
    .optional()
    .nullable(),
  discount_percent: numeric(0, 100),
  discount_amount: numeric(0),
  discount_cap_amount: numeric(0),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('permissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist (code PGRST205 or 42P01), return empty array instead of error
      if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('Could not find the table')) {
        console.warn('[GET /api/admin/permissions] Permissions table does not exist, returning empty array');
        return NextResponse.json({ data: [] });
      }
      console.error('[GET /api/admin/permissions] Database error:', error);
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('[GET /api/admin/permissions] Unexpected error:', err);
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = permissionSchema.parse(body);

    const payload = {
      name: parsed.name.trim(),
      description: parsed.description ? parsed.description.trim() : null,
      discount_percent: parsed.discount_percent,
      discount_amount: parsed.discount_amount,
      discount_cap_amount: parsed.discount_cap_amount,
    };

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('permissions')
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'ชื่อสิทธิ์ซ้ำ' }, { status: 409 });
      }
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



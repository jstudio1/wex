import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const createPriceSchema = z.object({
  permission_id: z.number().int().positive(),
  price: z.number().min(0),
});

const updatePriceSchema = z.object({
  price: z.number().min(0),
});

// GET - ดึงราคาทั้งหมดของ game account
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('game_account_prices')
      .select('*, permission:permissions(id, name)')
      .eq('game_account_id', numericId)
      .order('permission_id', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (err) {
    console.error('Get game account prices error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// POST - เพิ่มราคาใหม่
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const body = await req.json();
    const validated = createPriceSchema.parse(body);

    const sb = createServiceClient();

    // ตรวจสอบว่ามี game account หรือไม่
    const { data: account, error: accountError } = await sb
      .from('game_accounts')
      .select('id')
      .eq('id', numericId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'account_not_found' }, { status: 404 });
    }

    // ตรวจสอบว่ามีราคาสำหรับ permission นี้อยู่แล้วหรือไม่
    const { data: existing } = await sb
      .from('game_account_prices')
      .select('id')
      .eq('game_account_id', numericId)
      .eq('permission_id', validated.permission_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ 
        error: 'price_exists', 
        detail: 'มีราคาสำหรับสิทธิ์นี้อยู่แล้ว กรุณาใช้ PUT เพื่ออัปเดต' 
      }, { status: 400 });
    }

    const { data, error } = await sb
      .from('game_account_prices')
      .insert({
        game_account_id: numericId,
        permission_id: validated.permission_id,
        price: validated.price,
      })
      .select('*, permission:permissions(id, name)')
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('Create game account price error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


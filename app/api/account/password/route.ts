import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { hashPassword, verifyPassword } from '@/lib/hash';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6),
});

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
}

export async function PUT(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const { current_password, new_password } = parsed.data;

    const sb = createServiceClient();

    // ดึง password hash ปัจจุบัน
    const { data: userData, error: findErr } = await sb
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .maybeSingle();

    if (findErr || !userData) {
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    // ตรวจสอบรหัสผ่านปัจจุบัน
    const isValid = await verifyPassword(current_password, userData.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'invalid_password' }, { status: 401 });
    }

    // Hash รหัสผ่านใหม่
    const new_password_hash = await hashPassword(new_password);

    // อัปเดตรหัสผ่าน
    const { error: updateErr } = await sb
      .from('users')
      .update({ password_hash: new_password_hash, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateErr) {
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


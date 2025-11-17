import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const updateProfileSchema = z.object({
  username: z.string().min(3).max(30),
});

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('users')
    .select('id, username, created_at, updated_at, points, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    username: data.username,
    created_at: data.created_at,
    updated_at: data.updated_at,
    points: Number(data.points),
    is_admin: data.is_admin,
  });
}

export async function PUT(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const { username } = parsed.data;

    const sb = createServiceClient();

    // ตรวจสอบว่า username นี้ถูกใช้งานแล้วหรือไม่ (ยกเว้นตัวเอง)
    const { data: existing, error: findErr } = await sb
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', user.id)
      .maybeSingle();

    if (findErr) {
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: 'username_taken' }, { status: 409 });
    }

    // อัปเดต username
    const { data, error } = await sb
      .from('users')
      .update({ username, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('id, username, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      username: data.username,
      updated_at: data.updated_at,
    });
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


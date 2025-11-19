import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/error-messages';
import { z } from 'zod';

const updateProfileSchema = z.object({
  first_name: z.string().max(100).nullable().optional(),
  last_name: z.string().max(100).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
});

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('users')
    .select('id, username, created_at, updated_at, points, is_admin, first_name, last_name, email, phone, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ 
      error: 'db_error',
      message: getErrorMessage('db_error')
    }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    username: data.username,
    created_at: data.created_at,
    updated_at: data.updated_at,
    points: Number(data.points),
    is_admin: data.is_admin,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    avatar_url: data.avatar_url,
  });
}

export async function PUT(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'invalid_payload',
        message: getErrorMessage('invalid_payload')
      }, { status: 400 });
    }

    const sb = createServiceClient();

    // ตรวจสอบ email ซ้ำ (ถ้ามีการเปลี่ยน email)
    if (parsed.data.email) {
      const { data: existing, error: findErr } = await sb
        .from('users')
        .select('id')
        .eq('email', parsed.data.email)
        .neq('id', user.id)
        .maybeSingle();

      if (findErr) {
        return NextResponse.json({ 
          error: 'db_error',
          message: getErrorMessage('db_error')
        }, { status: 500 });
      }

      if (existing) {
        return NextResponse.json({ 
          error: 'email_taken',
          message: getErrorMessage('email_taken')
        }, { status: 409 });
      }
    }

    // เตรียมข้อมูลสำหรับอัปเดต
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.first_name !== undefined) updateData.first_name = parsed.data.first_name;
    if (parsed.data.last_name !== undefined) updateData.last_name = parsed.data.last_name;
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;

    // อัปเดตข้อมูล
    const { data, error } = await sb
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select('id, username, first_name, last_name, email, phone, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ 
        error: 'db_error',
        message: getErrorMessage('db_error')
      }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      username: data.username,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      updated_at: data.updated_at,
    });
  } catch {
    return NextResponse.json({ 
      error: 'unexpected',
      message: getErrorMessage('unexpected')
    }, { status: 500 });
  }
}


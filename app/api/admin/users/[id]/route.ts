import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { hashPassword } from '@/lib/hash';
import { z } from 'zod';

const updateUserSchema = z.object({
  username: z.string().min(1).max(50).nullable().optional(),
  points: z.number().optional(),
  is_admin: z.boolean().optional(),
  reset_password: z.boolean().optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('users')
    .select('id, username, points, created_at, is_admin')
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const currentUser = await getAuthUser();
  if (!currentUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = Number(params.id);
  
  // ตรวจสอบว่าไม่ใช่ตัวเอง (ป้องกันลบ/ลบสิทธิ์ตัวเอง)
  if (userId === currentUser.id) {
    return NextResponse.json({ error: 'cannot_modify_self' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parsed = updateUserSchema.parse(body);

    const sb = createServiceClient();

    // ตรวจสอบว่ามีผู้ใช้หรือไม่
    const { data: existingUser, error: fetchError } = await sb
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    // เตรียมข้อมูลที่จะอัปเดต
    const updateData: any = {};
    
    if (parsed.username !== undefined) {
      updateData.username = parsed.username?.trim() || null;
    }
    
    if (parsed.points !== undefined) {
      updateData.points = Math.max(0, parsed.points);
    }
    
    if (parsed.is_admin !== undefined) {
      updateData.is_admin = parsed.is_admin;
    }

    // รีเซ็ตรหัสผ่านเป็น "123456" ถ้าต้องการ
    if (parsed.reset_password) {
      const hashedPassword = await hashPassword('123456');
      updateData.password_hash = hashedPassword;
    }

    // อัปเดตข้อมูล
    const { data, error } = await sb
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, username, points, created_at, is_admin')
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const currentUser = await getAuthUser();
  if (!currentUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = Number(params.id);
  
  // ป้องกันลบตัวเอง
  if (userId === currentUser.id) {
    return NextResponse.json({ error: 'cannot_delete_self' }, { status: 400 });
  }

  const sb = createServiceClient();
  const { error } = await sb
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}


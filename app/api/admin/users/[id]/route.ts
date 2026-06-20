import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { hashPassword } from '@/lib/hash';
import { getErrorMessage } from '@/lib/error-messages';
import { z } from 'zod';

const updateUserSchema = z.object({
  username: z.string().min(1).max(50).nullable().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional().nullable(),
  points: z.number().optional(),
  is_admin: z.boolean().optional(),
  is_active: z.boolean().optional(),
  reset_password: z.boolean().optional(),
  new_password: z.string().min(6).max(100).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('users')
    .select('id, username, points, created_at, is_admin, is_active')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[GET /api/admin/users/[id]] Database error:', error);
    return NextResponse.json({ 
      error: 'db_error',
      message: getErrorMessage('db_error'),
      details: error.message 
    }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const currentUser = await getAuthUser();
  if (!currentUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const userId = Number(id);
  const isSelf = userId === currentUser.id;

  try {
    const body = await req.json();
    const parsed = updateUserSchema.parse(body);

    const sb = createServiceClient();

    // ตรวจสอบว่ามีผู้ใช้หรือไม่
    const { data: existingUser, error: fetchError } = await sb
      .from('users')
      .select('id, is_admin')
      .eq('id', userId)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json({ 
        error: 'user_not_found',
        message: 'ไม่พบผู้ใช้ในระบบ'
      }, { status: 404 });
    }

    // ป้องกันการลบสิทธิ์ admin ของตัวเอง
    if (isSelf && parsed.is_admin === false && existingUser.is_admin === true) {
      return NextResponse.json({ 
        error: 'cannot_remove_own_admin', 
        message: 'ไม่สามารถลบสิทธิ์ Admin ของตัวเองได้' 
      }, { status: 400 });
    }

    // เตรียมข้อมูลที่จะอัปเดต
    const updateData: any = {};
    
    if (parsed.username !== undefined) {
      updateData.username = parsed.username?.trim() || null;
    }

    if (parsed.firstName !== undefined) {
      updateData.first_name = parsed.firstName.trim();
    }
    if (parsed.lastName !== undefined) {
      updateData.last_name = parsed.lastName.trim();
    }
    if (parsed.email !== undefined) {
      const newEmail = parsed.email.trim().toLowerCase();
      // ตรวจสอบอีเมลซ้ำ (ถ้าเปลี่ยน)
      const { data: emailDup } = await sb
        .from('users')
        .select('id')
        .eq('email', newEmail)
        .neq('id', userId)
        .maybeSingle();
      if (emailDup) {
        return NextResponse.json({
          error: 'email_taken',
          message: 'อีเมลนี้ถูกใช้งานแล้ว'
        }, { status: 409 });
      }
      updateData.email = newEmail;
    }
    if (parsed.phone !== undefined) {
      const trimmed = (parsed.phone || '').trim();
      updateData.phone = trimmed.length ? trimmed : null;
    }

    if (parsed.points !== undefined) {
      updateData.points = Math.max(0, parsed.points);
    }
    
    // อนุญาตให้แก้ไข is_admin ได้ แต่ป้องกันการลบสิทธิ์ admin ของตัวเอง (ตรวจสอบแล้วด้านบน)
    if (parsed.is_admin !== undefined) {
      updateData.is_admin = parsed.is_admin;
    }

    // อนุญาตให้แก้ไข is_active ได้
    if (parsed.is_active !== undefined) {
      updateData.is_active = parsed.is_active;
    }

    // รีเซ็ตรหัสผ่าน
    if (parsed.reset_password && parsed.new_password) {
      const hashedPassword = await hashPassword(parsed.new_password);
      updateData.password_hash = hashedPassword;
    } else if (parsed.reset_password) {
      // ถ้า reset_password เป็น true แต่ไม่มี new_password ให้ใช้ "123456" เป็น default
      const hashedPassword = await hashPassword('123456');
      updateData.password_hash = hashedPassword;
    }

    // อัปเดตข้อมูล
    const { data, error } = await sb
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, username, first_name, last_name, email, phone, points, created_at, is_admin, is_active')
      .single();

    if (error) {
      console.error('[PUT /api/admin/users/[id]] Database error:', error);
      console.error('[PUT /api/admin/users/[id]] Update data:', updateData);
      console.error('[PUT /api/admin/users/[id]] User ID:', userId);
      return NextResponse.json({ 
        error: 'db_error',
        message: getErrorMessage('db_error'),
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error('[PUT /api/admin/users/[id]] Validation error:', err.issues);
      return NextResponse.json({ 
        error: 'validation_error', 
        details: err.issues,
        message: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่ส่งมา'
      }, { status: 400 });
    }
    console.error('[PUT /api/admin/users/[id]] Unexpected error:', err);
    console.error('[PUT /api/admin/users/[id]] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'unexpected',
      message: getErrorMessage('unexpected'),
      detail: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const currentUser = await getAuthUser();
  if (!currentUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const userId = Number(id);
  
  // ป้องกันลบตัวเอง
  if (userId === currentUser.id) {
    return NextResponse.json({ 
      error: 'cannot_delete_self',
      message: 'ไม่สามารถลบบัญชีของตัวเองได้'
    }, { status: 400 });
  }

  const sb = createServiceClient();
  const { error } = await sb
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ 
      error: 'db_error',
      message: getErrorMessage('db_error')
    }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}


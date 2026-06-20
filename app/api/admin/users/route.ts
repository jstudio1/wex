import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { hashPassword } from '@/lib/hash';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().min(10).max(20).optional().or(z.literal('')),
  points: z.number().min(0).optional(),
  is_admin: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export async function GET() {
  try {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
    
    // Fetch users (without permission_id since column doesn't exist)
    const { data: users, error: usersError } = await sb
    .from('users')
      .select('id, username, email, first_name, last_name, phone, points, created_at, is_admin, is_active')
    .order('created_at', { ascending: false });

    if (usersError) {
      console.error('[GET /api/admin/users] Database error:', usersError);
      return NextResponse.json({ error: 'db_error', detail: usersError.message }, { status: 500 });
  }

    // Return users without permission data (permissions table doesn't exist)
    const data = (users || []).map((user: any) => ({
      ...user,
      permission: null,
    }));

  return NextResponse.json({ data });
  } catch (err) {
    console.error('[GET /api/admin/users] Unexpected error:', err);
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
    const body = await req.json().catch(() => ({}));
    const parsed = createUserSchema.parse(body);
    const sb = createServiceClient();

    const [usernameCheck, emailCheck] = await Promise.all([
      sb.from('users').select('id').eq('username', parsed.username).maybeSingle(),
      sb.from('users').select('id').eq('email', parsed.email).maybeSingle(),
    ]);

    if (usernameCheck.error || emailCheck.error) {
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    if (usernameCheck.data) {
      return NextResponse.json({ error: 'username_taken', message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' }, { status: 409 });
    }

    if (emailCheck.data) {
      return NextResponse.json({ error: 'email_taken', message: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 409 });
    }

    const password_hash = await hashPassword(parsed.password);
    const { data, error } = await sb
      .from('users')
      .insert({
        username: parsed.username,
        password_hash,
        first_name: parsed.firstName,
        last_name: parsed.lastName,
        email: parsed.email,
        phone: parsed.phone || null,
        points: parsed.points ?? 0,
        is_admin: parsed.is_admin ?? false,
        is_active: parsed.is_active ?? true,
      })
      .select('id, username, email, first_name, last_name, phone, points, created_at, is_admin, is_active')
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', details: err.issues }, { status: 400 });
    }

    return NextResponse.json({
      error: 'unexpected',
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}

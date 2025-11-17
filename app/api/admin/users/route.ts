import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('users')
    .select('id, username, points, created_at, is_admin, permission_id, permission:permissions(id, name)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ data });
}


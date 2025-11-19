import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
    
    // Fetch users (without permission_id since column doesn't exist)
    const { data: users, error: usersError } = await sb
    .from('users')
      .select('id, username, points, created_at, is_admin, is_active')
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


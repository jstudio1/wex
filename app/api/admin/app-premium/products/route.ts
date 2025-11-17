import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('app_premium_products')
    .select('*')
    .order('name');

  if (error) {
    console.error('Admin app premium products GET error:', error);
    return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}


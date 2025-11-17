import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = createServiceClient();
  const { data, error } = await sb.from('users').select('points').eq('id', user.id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'db_error' }, { status: 500 });
  return NextResponse.json({ points: Number(data.points) });
}




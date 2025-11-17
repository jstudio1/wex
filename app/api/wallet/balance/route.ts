import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('users')
    .select('points')
    .eq('id', user.id)
    .maybeSingle();
    
  if (error) {
    console.error('Wallet balance error:', error);
    return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  }
  
  if (!data) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }
  
  return NextResponse.json({ 
    points: Number(data.points || 0)
  });
}




import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServiceClient();

    const { count, error } = await sb
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .eq('last_sender_role', 'user');

    if (error) {
      console.error('[admin][tickets][unread-count] error', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (err) {
    console.error('[admin][tickets][unread-count] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

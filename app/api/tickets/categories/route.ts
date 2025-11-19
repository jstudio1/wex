import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { ensureTicketSettings } from '@/lib/tickets';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const sb = createServiceClient();
    const [settings, { data: categories, error }] = await Promise.all([
      ensureTicketSettings(sb),
      sb
        .from('ticket_categories')
        .select('id, name, description, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ]);
    if (error && error.code !== '42P01') {
      console.error('[tickets][categories] load error', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }
    return NextResponse.json({
      categories: (categories || []).filter((cat) => cat.is_active),
      settings: {
        is_enabled: !!settings?.is_enabled,
        max_open_per_user: settings?.max_open_per_user ?? 3,
      },
    });
  } catch (err) {
    console.error('[tickets][categories] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



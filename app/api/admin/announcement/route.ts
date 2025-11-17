import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data } = await sb
    .from('settings')
    .select('key, value')
    .in('key', ['ANNOUNCEMENT_TEXT', 'ANNOUNCEMENT_ENABLED']);

  const map: Record<string, string> = {};
  for (const row of data || []) {
    map[row.key as string] = row.value as string;
  }

  return NextResponse.json({
    text: map.ANNOUNCEMENT_TEXT || '',
    enabled: map.ANNOUNCEMENT_ENABLED === 'true',
  });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const text = String(body?.text || '').trim();
    const enabled = Boolean(body?.enabled);

    const sb = createServiceClient();
    await sb.from('settings').upsert({ key: 'ANNOUNCEMENT_TEXT', value: text }, { onConflict: 'key' });
    await sb.from('settings').upsert({ key: 'ANNOUNCEMENT_ENABLED', value: enabled ? 'true' : 'false' }, { onConflict: 'key' });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


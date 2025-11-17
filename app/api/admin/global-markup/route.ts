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
    .in('key', ['PRICING_MARKUP_PERCENT', 'PRICING_MARKUP_FIXED']);

  const map = new Map<string, string>();
  for (const row of data || []) {
    map.set(row.key as string, row.value as string);
  }

  return NextResponse.json({
    percent: Number(map.get('PRICING_MARKUP_PERCENT') || '0'),
    fixed: Number(map.get('PRICING_MARKUP_FIXED') || '0')
  });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { percent, fixed } = body ?? {};

    if (typeof percent !== 'number' || typeof fixed !== 'number') {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const sb = createServiceClient();

    await sb.from('settings').upsert([
      { key: 'PRICING_MARKUP_PERCENT', value: String(percent) },
      { key: 'PRICING_MARKUP_FIXED', value: String(fixed) }
    ], { onConflict: 'key' });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Global markup update error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


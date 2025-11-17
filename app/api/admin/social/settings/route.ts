import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

const KEY = 'social_exchange_rate';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data } = await sb.from('settings').select('value').eq('key', KEY).maybeSingle();
  return NextResponse.json({ exchangeRate: data?.value ? Number(data.value) : null });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { exchangeRate } = await req.json();
  const value = Number(exchangeRate);
  if (!value || value <= 0) {
    return NextResponse.json({ error: 'invalid_rate' }, { status: 400 });
  }

  const sb = createServiceClient();
  const { error } = await sb
    .from('settings')
    .upsert({ key: KEY, value: String(value) }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  try { revalidateTag('social-services'); } catch {}
  return NextResponse.json({ ok: true, exchangeRate: value });
}


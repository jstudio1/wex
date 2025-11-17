import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('social_categories')
    .select('id, name, slug, is_published')
    .order('name');

  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const payload = await req.json();
  const { id, name, is_published } = payload ?? {};
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof name === 'string') update.name = name;
  if (typeof is_published === 'boolean') update.is_published = is_published;
  if (!Object.keys(update).length) return NextResponse.json({ error: 'empty_payload' }, { status: 400 });

  const sb = createServiceClient();
  const { error } = await sb
    .from('social_categories')
    .update(update)
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}


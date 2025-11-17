import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('cashcard_categories')
    .select('id, category, display_name, image_url, is_published, created_at, updated_at')
    .order('category');

  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const payload = await req.json();
  const { id, display_name, image_url, is_published } = payload ?? {};
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof display_name === 'string') update.display_name = display_name;
  if (image_url !== undefined) update.image_url = image_url === '' || image_url === null ? null : image_url;
  if (typeof is_published === 'boolean') update.is_published = is_published;
  if (!Object.keys(update).length) return NextResponse.json({ error: 'empty_payload' }, { status: 400 });

  update.updated_at = new Date().toISOString();

  const sb = createServiceClient();
  const { error } = await sb
    .from('cashcard_categories')
    .update(update)
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}


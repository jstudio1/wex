import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const numericId = Number(id);
  if (!numericId) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const payload = await req.json();
  const update: Record<string, unknown> = {};

  if (typeof payload.display_name === 'string') update.display_name = payload.display_name;
  if (typeof payload.markup_percent === 'number') update.markup_percent = payload.markup_percent;
  if (typeof payload.markup_fixed === 'number') update.markup_fixed = payload.markup_fixed;
  if (typeof payload.is_published === 'boolean') update.is_published = payload.is_published;
  if (payload.category_id === null || typeof payload.category_id === 'number') update.category_id = payload.category_id;

  if (!Object.keys(update).length) return NextResponse.json({ error: 'empty_payload' }, { status: 400 });

  const sb = createServiceClient();
  const { error } = await sb
    .from('social_services')
    .update(update)
    .eq('id', numericId);

  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}


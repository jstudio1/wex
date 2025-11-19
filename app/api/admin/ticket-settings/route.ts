import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { ensureTicketSettings } from '@/lib/tickets';

const updateSchema = z.object({
  is_enabled: z.boolean().optional(),
  max_open_per_user: z.coerce.number().int().min(1).max(10).optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const sb = createServiceClient();
    const settings = await ensureTicketSettings(sb);
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('[admin][ticket-settings][GET] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const payload = updateSchema.parse(body);
    const sb = createServiceClient();
    const settings = await ensureTicketSettings(sb);
    const { data, error } = await sb
      .from('ticket_settings')
      .update({
        is_enabled: payload.is_enabled ?? settings.is_enabled,
        max_open_per_user: payload.max_open_per_user ?? settings.max_open_per_user,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id)
      .select('*')
      .single();
    if (error || !data) {
      console.error('[admin][ticket-settings][PUT] update error', error);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ settings: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.flatten() }, { status: 400 });
    }
    console.error('[admin][ticket-settings][PUT] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



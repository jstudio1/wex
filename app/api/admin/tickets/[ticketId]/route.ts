import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { TICKET_STATUS, summarizeMessageBody } from '@/lib/tickets';

const paramsSchema = z.object({
  ticketId: z.coerce.number().int().positive(),
});

const updateSchema = z.object({
  status: z.enum(TICKET_STATUS as unknown as [string, ...string[]]).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  title: z.string().min(3).max(120).optional(),
});

export async function GET(_: Request, context: { params: { ticketId: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { ticketId } = paramsSchema.parse(context.params);
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('tickets')
      .select(
        `
        id,
        title,
        status,
        description,
        created_at,
        updated_at,
        last_message_at,
        last_message_preview,
        user:users!tickets_user_id_fkey(id, username, avatar_url),
        category:ticket_categories(id, name, description)
      `,
      )
      .eq('id', ticketId)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ticket: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.flatten() }, { status: 400 });
    }
    console.error('[admin][tickets][detail][GET] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: { ticketId: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const payload = updateSchema.parse(body);
    if (!payload.status && !payload.category_id && !payload.title) {
      return NextResponse.json({ error: 'no_changes' }, { status: 400 });
    }
    const { ticketId } = paramsSchema.parse(context.params);
    const sb = createServiceClient();

    if (payload.category_id) {
      const { data: category, error: catError } = await sb
        .from('ticket_categories')
        .select('id, is_active')
        .eq('id', payload.category_id)
        .maybeSingle();
      if (catError || !category || !category.is_active) {
        return NextResponse.json({ error: 'invalid_category' }, { status: 400 });
      }
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (payload.title) updates.title = payload.title.trim();
    if (payload.status) {
      updates.status = payload.status;
      if (payload.status === 'closed') {
        updates.closed_at = new Date().toISOString();
        updates.last_message_preview = summarizeMessageBody('ปิด Ticket โดยแอดมิน');
        updates.last_sender_role = 'admin';
      }
    }
    if (payload.category_id) updates.category_id = payload.category_id;

    const { data, error } = await sb
      .from('tickets')
      .update(updates)
      .eq('id', ticketId)
      .select(
        `
        id,
        title,
        status,
        created_at,
        updated_at,
        last_message_at,
        last_message_preview,
        user:users!tickets_user_id_fkey(id, username),
        category:ticket_categories(id,name)
      `,
      )
      .single();
    if (error || !data) {
      console.error('[admin][tickets][PATCH] update error', error);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ ticket: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.flatten() }, { status: 400 });
    }
    console.error('[admin][tickets][PATCH] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



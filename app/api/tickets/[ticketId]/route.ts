import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { summarizeMessageBody } from '@/lib/tickets';

const paramsSchema = z.object({
  ticketId: z.coerce.number().int().positive(),
});

const updateSchema = z.object({
  action: z.enum(['close']).default('close'),
});

export async function GET(_: Request, context: { params: { ticketId: string } }) {
  const user = await getAuthUser();
  if (!user) {
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
        last_sender_role,
        category:ticket_categories(id,name,description)
      `,
      )
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ticket: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.flatten() }, { status: 400 });
    }
    console.error('[tickets][detail][GET] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: { ticketId: string } }) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const payload = updateSchema.parse(body);
    const { ticketId } = paramsSchema.parse(context.params);
    const sb = createServiceClient();

    const { data: ticket, error: ticketError } = await sb
      .from('tickets')
      .select('id, status, user_id')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'already_closed' }, { status: 400 });
    }

    if (payload.action === 'close') {
      const { data, error } = await sb
        .from('tickets')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          last_message_preview: summarizeMessageBody('Ticket ถูกปิดโดยผู้ใช้'),
          last_sender_role: 'user',
        })
        .eq('id', ticket.id)
        .select(
          `
          id,
          title,
          status,
          created_at,
          updated_at,
          last_message_at,
          last_message_preview,
          category:ticket_categories(id,name)
        `,
        )
        .single();
      if (error || !data) {
        console.error('[tickets][PATCH] close error', error);
        return NextResponse.json({ error: 'update_failed' }, { status: 500 });
      }
      return NextResponse.json({ ticket: data });
    }

    return NextResponse.json({ error: 'unsupported_action' }, { status: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.flatten() }, { status: 400 });
    }
    console.error('[tickets][PATCH] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



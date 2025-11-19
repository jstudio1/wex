import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { TicketFileValidationError, uploadTicketFiles, validateTicketFiles, signAttachmentUrls } from '@/lib/ticket-files';
import { summarizeMessageBody } from '@/lib/tickets';

const paramsSchema = z.object({
  ticketId: z.coerce.number().int().positive(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
});

const messageSchema = z.object({
  message: z.string().min(1).max(4000),
  status: z.enum(['open', 'in_progress', 'waiting_customer', 'closed']).optional(),
});

export async function GET(req: Request, context: { params: { ticketId: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const pagination = paginationSchema.parse({
      page: url.searchParams.get('page') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    });
    const { ticketId } = paramsSchema.parse(context.params);
    const sb = createServiceClient();

    const from = (pagination.page - 1) * pagination.limit;
    const to = from + pagination.limit - 1;

    const { data: messages, error } = await sb
      .from('ticket_messages')
      .select(
        `
        id,
        ticket_id,
        sender_id,
        sender_role,
        body,
        has_attachments,
        created_at,
        attachments:ticket_message_attachments(
          id,
          message_id,
          ticket_id,
          file_name,
          file_type,
          file_size,
          storage_path,
          created_at
        )
      `,
      )
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('[admin][tickets][messages][GET] error', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    const attachments = (messages || []).flatMap((message) => message.attachments || []);
    const enriched = attachments.length ? await signAttachmentUrls(sb, attachments as any) : [];
    const map = new Map(enriched.map((att) => [att.id, att.url]));

    const response = (messages || []).map((message) => ({
      ...message,
      attachments: (message.attachments || []).map((att: any) => ({
        ...att,
        url: map.get(att.id) || (att as any).url,
      })),
    }));

    return NextResponse.json({ messages: response });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.flatten() }, { status: 400 });
    }
    console.error('[admin][tickets][messages][GET] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: { ticketId: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { ticketId } = paramsSchema.parse(context.params);
    const sb = createServiceClient();
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key === 'files') continue;
      if (typeof value === 'string') payload[key] = value;
    }
    const validated = messageSchema.safeParse(payload);
    if (!validated.success) {
      return NextResponse.json({ error: 'validation_error', detail: validated.error.flatten() }, { status: 400 });
    }
    const files = formData.getAll('files').filter((file): file is File => file instanceof File);
    validateTicketFiles(files);

    const { data: ticket, error: ticketError } = await sb
      .from('tickets')
      .select('id, status')
      .eq('id', ticketId)
      .maybeSingle();
    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'ticket_closed' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: message, error: messageError } = await sb
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: admin.id,
        sender_role: 'admin',
        body: validated.data.message.trim(),
        has_attachments: files.length > 0,
      })
      .select(
        `
        id,
        ticket_id,
        sender_role,
        body,
        has_attachments,
        created_at
      `,
      )
      .single();
    if (messageError || !message) {
      console.error('[admin][tickets][messages][POST] insert error', messageError);
      return NextResponse.json({ error: 'create_failed' }, { status: 500 });
    }

    if (files.length) {
      await uploadTicketFiles({ sb, ticketId: ticket.id, messageId: message.id, files });
    }

    const updatedStatus =
      validated.data.status ||
      (ticket.status === 'waiting_customer' ? 'waiting_customer' : 'in_progress');

    const { error: updateError } = await sb
      .from('tickets')
      .update({
        status: updatedStatus,
        updated_at: now,
        last_message_at: now,
        last_message_preview: summarizeMessageBody(validated.data.message.trim()),
        last_sender_role: 'admin',
      })
      .eq('id', ticket.id);
    if (updateError) {
      console.error('[admin][tickets][messages][POST] update ticket error', updateError);
    }

    return NextResponse.json({ message });
  } catch (err) {
    if (err instanceof TicketFileValidationError) {
      return NextResponse.json({ error: 'file_invalid', message: err.message }, { status: 400 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.flatten() }, { status: 400 });
    }
    console.error('[admin][tickets][messages][POST] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



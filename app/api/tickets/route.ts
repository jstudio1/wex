import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { USER_TICKET_FILTERS, summarizeMessageBody } from '@/lib/tickets';
import { TicketFileValidationError, uploadTicketFiles, validateTicketFiles } from '@/lib/ticket-files';

const filterSchema = z.enum(['open', 'closed', 'all']).default('open');

const createTicketSchema = z.object({
  title: z.string().min(3).max(120),
  category_id: z.coerce.number().int().positive(),
  message: z.string().min(5).max(4000),
});

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const filter = filterSchema.parse(url.searchParams.get('filter') || undefined);
    const statuses = USER_TICKET_FILTERS[filter];
    const sb = createServiceClient();

    const query = sb
      .from('tickets')
      .select(
        `
        id,
        title,
        status,
        created_at,
        updated_at,
        last_message_at,
        last_message_preview,
        last_sender_role,
        category:ticket_categories(id,name,description)
      `,
      )
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (filter !== 'all') {
      query.in('status', statuses);
    }

    const [{ data: tickets, error }, openCount, closedCount, totalCount] = await Promise.all([
      query,
      sb
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', USER_TICKET_FILTERS.open),
      sb
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'closed'),
      sb.from('tickets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    if (error) {
      console.error('[tickets][GET] list error', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    return NextResponse.json({
      tickets: tickets || [],
      totals: {
        open: openCount.count || 0,
        closed: closedCount.count || 0,
        all: totalCount.count || 0,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.flatten() }, { status: 400 });
    }
    console.error('[tickets][GET] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServiceClient();
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key === 'files') continue;
      if (typeof value === 'string') {
        payload[key] = value;
      }
    }
    const validated = createTicketSchema.safeParse(payload);
    if (!validated.success) {
      return NextResponse.json({ error: 'validation_error', detail: validated.error.flatten() }, { status: 400 });
    }

    const files = formData.getAll('files').filter((file): file is File => file instanceof File);
    validateTicketFiles(files);

    const [settings, openCount] = await Promise.all([
      (async () => {
        const { data, error } = await sb.from('ticket_settings').select('*').limit(1).maybeSingle();
        if (error && error.code !== '42P01') {
          throw error;
        }
        return data || null;
      })(),
      sb
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', USER_TICKET_FILTERS.open),
    ]);

    const isEnabled = settings?.is_enabled ?? true;
    if (!isEnabled) {
      return NextResponse.json({ error: 'disabled', message: 'ระบบ Ticket ถูกปิดชั่วคราว' }, { status: 400 });
    }

    const maxOpen = settings?.max_open_per_user ?? 3;
    if ((openCount.count || 0) >= maxOpen) {
      return NextResponse.json(
        {
          error: 'limit_reached',
          message: `คุณเปิด Ticket ครบ ${maxOpen} รายการแล้ว กรุณาปิดรายการเก่าก่อน`,
        },
        { status: 400 },
      );
    }

    const { data: category, error: categoryError } = await sb
      .from('ticket_categories')
      .select('id, name, is_active')
      .eq('id', validated.data.category_id)
      .maybeSingle();
    if (categoryError || !category || !category.is_active) {
      return NextResponse.json({ error: 'invalid_category' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: ticket, error: ticketError } = await sb
      .from('tickets')
      .insert({
        user_id: user.id,
        category_id: validated.data.category_id,
        title: validated.data.title.trim(),
        description: validated.data.message.trim(),
        status: 'open',
        last_message_at: now,
        last_message_preview: summarizeMessageBody(validated.data.message.trim()),
        last_sender_role: 'user',
      })
      .select(
        `
        id,
        title,
        status,
        created_at,
        updated_at,
        last_message_at,
        last_message_preview,
        last_sender_role,
        category:ticket_categories(id,name,description)
      `,
      )
      .single();

    if (ticketError || !ticket) {
      console.error('[tickets][POST] insert ticket error', ticketError);
      return NextResponse.json({ error: 'create_failed' }, { status: 500 });
    }

    const { data: message, error: messageError } = await sb
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_role: 'user',
        body: validated.data.message.trim(),
        has_attachments: files.length > 0,
      })
      .select('id')
      .single();

    if (messageError || !message) {
      console.error('[tickets][POST] insert message error', messageError);
      return NextResponse.json({ error: 'create_failed' }, { status: 500 });
    }

    if (files.length) {
      await uploadTicketFiles({
        sb,
        ticketId: ticket.id,
        messageId: message.id,
        files,
      });
    }
    
    try {
      const { sendTelegramNotification } = await import('@/lib/telegram');
      const catName = Array.isArray(ticket.category) ? ticket.category[0]?.name : (ticket.category as any)?.name;
      await sendTelegramNotification(
        `🎫 <b>เปิด Ticket ใหม่:</b> #${ticket.id}\n<b>ผู้ใช้:</b> ${user.username} (ID: ${user.id})\n<b>หัวข้อ:</b> ${ticket.title}\n<b>หมวดหมู่:</b> ${catName || '-'}\n<b>ข้อความ:</b> ${ticket.last_message_preview}`,
        'ticket'
      );
    } catch (e) {
      console.error('Failed to send telegram ticket notification:', e);
    }

    return NextResponse.json({ ticket });
  } catch (err) {
    if (err instanceof TicketFileValidationError) {
      return NextResponse.json({ error: 'file_invalid', message: err.message }, { status: 400 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.flatten() }, { status: 400 });
    }
    console.error('[tickets][POST] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



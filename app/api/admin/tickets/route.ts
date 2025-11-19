import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { TICKET_STATUS } from '@/lib/tickets';

const querySchema = z.object({
  status: z.enum(['all', ...TICKET_STATUS]).default('open'),
  category_id: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const params = querySchema.parse({
      status: url.searchParams.get('status') || undefined,
      category_id: url.searchParams.get('category_id') || undefined,
      search: url.searchParams.get('search') || undefined,
      page: url.searchParams.get('page') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    });
    const sb = createServiceClient();
    const from = (params.page - 1) * params.limit;
    const to = from + params.limit - 1;

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
        user:users!tickets_user_id_fkey(id, username, avatar_url),
        category:ticket_categories(id, name)
      `,
        { count: 'exact' },
      )
      .order('last_message_at', { ascending: false })
      .range(from, to);

    if (params.status !== 'all') {
      query.eq('status', params.status);
    }
    if (params.category_id) {
      query.eq('category_id', params.category_id);
    }
    if (params.search) {
      const keyword = params.search.trim();
      query.or(`title.ilike.%${keyword}%,users.username.ilike.%${keyword}%`);
    }

    const [{ data, error, count }, ...statusCounts] = await Promise.all([
      query,
      ...TICKET_STATUS.map((status) =>
        sb.from('tickets').select('id', { count: 'exact', head: true }).eq('status', status),
      ),
    ]);

    if (error) {
      console.error('[admin][tickets][GET] list error', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    const stats = TICKET_STATUS.reduce<Record<string, number>>((acc, status, index) => {
      const stat = statusCounts[index];
      acc[status] = stat?.count || 0;
      return acc;
    }, {});

    return NextResponse.json({
      tickets: data || [],
      total: count || 0,
      stats,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.flatten() }, { status: 400 });
    }
    console.error('[admin][tickets][GET] unexpected', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



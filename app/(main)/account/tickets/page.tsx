import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { USER_TICKET_FILTERS } from '@/lib/tickets';
import TicketsClient from './tickets-client';

export const dynamic = 'force-dynamic';

export default async function AccountTicketsPage() {
  noStore();
  const user = await getAuthUser();
  if (!user) {
    redirect('/login?redirect=/account/tickets');
  }
  const sb = createServiceClient();

  const [ticketsRes, openCount, closedCount, totalCount, categoriesRes, settingsRes] = await Promise.all([
    sb
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
        category:ticket_categories(id,name,description,is_active)
      `,
      )
      .eq('user_id', user.id)
      .in('status', USER_TICKET_FILTERS.open)
      .order('last_message_at', { ascending: false })
      .limit(20),
    sb
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', USER_TICKET_FILTERS.open),
    sb.from('tickets').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'closed'),
    sb.from('tickets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    sb
      .from('ticket_categories')
      .select('id, name, description, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    sb.from('ticket_settings').select('*').limit(1).maybeSingle(),
  ]);

  const tickets = (ticketsRes.data || []).map((ticket: any) => ({
    ...ticket,
    category: Array.isArray(ticket.category) ? ticket.category[0] || null : ticket.category || null,
  }));
  const totals = {
    open: openCount.count || 0,
    closed: closedCount.count || 0,
    all: totalCount.count || 0,
  };

  return (
    <TicketsClient
      initialTickets={tickets}
      initialTotals={totals}
      categories={(categoriesRes.data || []).filter((c) => c.is_active)}
      settings={{
        is_enabled: settingsRes.data?.is_enabled ?? true,
        max_open_per_user: settingsRes.data?.max_open_per_user ?? 3,
      }}
    />
  );
}



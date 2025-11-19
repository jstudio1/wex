import type { SupabaseClient } from '@supabase/supabase-js';

export const TICKET_BUCKET = 'ticket-attachments';
export const MAX_TICKET_FILE_SIZE = 8 * 1024 * 1024; // 8MB
export const MAX_TICKET_ATTACHMENTS = 5;

export const ALLOWED_TICKET_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
];

export const TICKET_STATUS = ['open', 'in_progress', 'waiting_customer', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUS)[number];

export const ADMIN_TICKET_STATUS_OPTIONS: { value: TicketStatus; label: string; description: string }[] = [
  {
    value: 'open',
    label: 'Open',
    description: 'Ticket ใหม่ที่ยังไม่ได้รับการจัดการ',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    description: 'แอดมินกำลังจัดการอยู่',
  },
  {
    value: 'waiting_customer',
    label: 'Waiting for Customer',
    description: 'ต้องการข้อมูลเพิ่มเติมจากลูกค้า',
  },
  {
    value: 'closed',
    label: 'Closed',
    description: 'ปิดงานเรียบร้อยแล้ว',
  },
];

export const USER_TICKET_FILTERS = {
  open: ['open', 'in_progress', 'waiting_customer'],
  closed: ['closed'],
  all: TICKET_STATUS,
} as const;

export function getTicketStatusLabel(status: TicketStatus) {
  switch (status) {
    case 'open':
      return 'เปิด';
    case 'in_progress':
      return 'กำลังดำเนินการ';
    case 'waiting_customer':
      return 'รอลูกค้า';
    case 'closed':
    default:
      return 'ปิด';
  }
}

export function getTicketStatusBadgeClasses(status: TicketStatus) {
  switch (status) {
    case 'open':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    case 'in_progress':
      return 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
    case 'waiting_customer':
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    case 'closed':
    default:
      return 'bg-gray-600/20 text-gray-300 border border-gray-600/40';
  }
}

export async function ensureTicketSettings(sb: SupabaseClient) {
  const { data, error } = await sb.from('ticket_settings').select('*').limit(1).maybeSingle();
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST116') {
      // table not found or no rows yet
    } else {
      throw error;
    }
  }
  if (data) {
    return data;
  }
  const now = new Date().toISOString();
  const { data: created, error: createError } = await sb
    .from('ticket_settings')
    .insert({
      id: 1,
      is_enabled: true,
      max_open_per_user: 3,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();
  if (createError) {
    throw createError;
  }
  return created;
}

export async function fetchTicketSettings(sb: SupabaseClient) {
  const { data, error } = await sb.from('ticket_settings').select('*').limit(1).maybeSingle();
  if (error) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
  return data || null;
}

export function buildTicketAttachmentPath(ticketId: number, messageId: number, fileName: string) {
  const sanitizedBase = fileName.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase();
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${ticketId}/${messageId}/${unique}-${sanitizedBase}`;
}

export function summarizeMessageBody(body: string | null) {
  if (!body) return 'ส่งไฟล์แนบ';
  return body.length > 160 ? `${body.slice(0, 157)}...` : body;
}



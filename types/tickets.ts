import type { TicketStatus } from '@/lib/tickets';

export type TicketCategory = {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type TicketSettings = {
  id: number;
  is_enabled: boolean;
  max_open_per_user: number;
  created_at?: string;
  updated_at?: string;
};

export type TicketSummary = {
  id: number;
  title: string;
  status: TicketStatus;
  category?: TicketCategory | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_preview?: string | null;
  last_sender_role?: 'user' | 'admin' | null;
  user?: {
    id: number;
    username: string;
    avatar_url?: string | null;
  };
};

export type TicketMessageAttachment = {
  id: number;
  message_id: number;
  ticket_id?: number;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  url?: string;
  created_at: string;
};

export type TicketMessage = {
  id: number;
  ticket_id: number;
  sender_id: number | null;
  sender_role: 'user' | 'admin';
  body: string | null;
  has_attachments: boolean;
  created_at: string;
  attachments?: TicketMessageAttachment[];
};



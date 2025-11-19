import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ALLOWED_TICKET_FILE_TYPES,
  MAX_TICKET_ATTACHMENTS,
  MAX_TICKET_FILE_SIZE,
  TICKET_BUCKET,
  buildTicketAttachmentPath,
} from './tickets';
import type { TicketMessageAttachment } from '@/types/tickets';

export class TicketFileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TicketFileValidationError';
  }
}

export async function ensureTicketBucket(sb: SupabaseClient) {
  try {
    await sb.storage.createBucket(TICKET_BUCKET, {
      public: false,
      fileSizeLimit: MAX_TICKET_FILE_SIZE,
    });
  } catch (error: any) {
    if (error?.statusCode === '409' || error?.message?.includes('already exists')) {
      return;
    }
    if (error?.message?.includes('Bucket already exists')) {
      return;
    }
    console.error('[ticket-storage] createBucket error', error);
  }
}

export function validateTicketFiles(files: File[]) {
  if (files.length > MAX_TICKET_ATTACHMENTS) {
    throw new TicketFileValidationError(`แนบไฟล์ได้สูงสุด ${MAX_TICKET_ATTACHMENTS} ไฟล์ต่อครั้ง`);
  }
  for (const file of files) {
    if (file.size > MAX_TICKET_FILE_SIZE) {
      throw new TicketFileValidationError('ไฟล์ต้องมีขนาดไม่เกิน 8MB');
    }
    if (file.type && !ALLOWED_TICKET_FILE_TYPES.includes(file.type)) {
      throw new TicketFileValidationError('รูปแบบไฟล์ไม่รองรับ');
    }
  }
}

export async function uploadTicketFiles(options: {
  sb: SupabaseClient;
  ticketId: number;
  messageId: number;
  files: File[];
}) {
  const { sb, ticketId, messageId, files } = options;
  if (!files.length) return [];
  await ensureTicketBucket(sb);
  const uploads: Omit<TicketMessageAttachment, 'id' | 'url'>[] = [];

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name || 'attachment';
    const path = buildTicketAttachmentPath(ticketId, messageId, fileName);
    const { error } = await sb.storage.from(TICKET_BUCKET).upload(path, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (error) {
      console.error('[ticket-storage] upload error', error);
      throw new Error('อัปโหลดไฟล์ไม่สำเร็จ');
    }
    uploads.push({
      message_id: messageId,
      ticket_id: ticketId,
      file_name: fileName,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      storage_path: path,
      created_at: new Date().toISOString(),
    } as any);
  }

  if (uploads.length) {
    const { error } = await sb.from('ticket_message_attachments').insert(uploads);
    if (error) {
      console.error('[ticket-storage] insert attachment error', error);
      throw new Error('บันทึกไฟล์แนบไม่สำเร็จ');
    }
  }

  return uploads;
}

export async function signAttachmentUrls(sb: SupabaseClient, attachments: TicketMessageAttachment[]) {
  if (!attachments.length) return attachments;
  const paths = attachments.map((att) => att.storage_path);
  const { data, error } = await sb.storage.from(TICKET_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) {
    console.error('[ticket-storage] signed url error', error);
    return attachments;
  }
  const urlMap = new Map<string, string>();
  data?.forEach((item, index) => {
    if (item?.signedUrl) {
      urlMap.set(paths[index], item.signedUrl);
    }
  });
  return attachments.map((att) => ({
    ...att,
    url: urlMap.get(att.storage_path) || att.url,
  }));
}



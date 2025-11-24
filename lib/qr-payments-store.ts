import { createServiceClient, supabaseUrl } from './supabase';

type PaymentStatus = 'PENDING' | 'PAID' | 'TIMEOUT' | 'CANCELLED';

export interface PaymentRecord {
  idPay: string;
  ref1: string;
  amount: number;
  status: PaymentStatus;
  createdAt: number;
  paidAt?: number;
  expiresAt?: number;
  timeoutSeconds?: number;
  qrImageBase64?: string;
}

const KEY_PREFIX = 'QR_PAYMENT:';

const buildKey = (idPay: string) => `${KEY_PREFIX}${idPay}`;

const serializeRecord = (record: PaymentRecord) => JSON.stringify(record);

const deserializeRecord = (value?: string | null): PaymentRecord | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as PaymentRecord;
  } catch {
    return null;
  }
};

async function writeRecord(record: PaymentRecord) {
  const sb = createServiceClient();
  const { error } = await sb
    .from('settings')
    .upsert(
      {
        key: buildKey(record.idPay),
        value: serializeRecord(record),
      },
      { onConflict: 'key' }
    );

  if (error) {
    throw new Error(`Failed to persist QR payment: ${error.message}`);
  }

  return record;
}

async function readRecord(idPay: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase configuration is missing');
  }

  const restUrl = `${supabaseUrl}/rest/v1/settings?select=value&key=eq.${encodeURIComponent(
    buildKey(idPay)
  )}&limit=1`;

  const response = await fetch(restUrl, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Cache-Control': 'no-store'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    console.error('[QR][STORE] readRecord rest error', response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as Array<{ value: string | null }>;
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const record = deserializeRecord(payload[0]?.value);
  return record;
}

async function updateRecord(idPay: string, updates: Partial<PaymentRecord>) {
  const existing = await readRecord(idPay);
  if (!existing) return null;
  const updated: PaymentRecord = { ...existing, ...updates };
  await writeRecord(updated);
  return updated;
}

export async function savePayment(record: PaymentRecord) {
  const expiresAt =
    record.expiresAt ??
    (typeof record.timeoutSeconds === 'number'
      ? Date.now() + record.timeoutSeconds * 1000
      : undefined);

  const payload: PaymentRecord = {
    ...record,
    expiresAt,
  };

  return writeRecord(payload);
}

export async function markPaymentPaid(idPay: string) {
  return updateRecord(idPay, { status: 'PAID', paidAt: Date.now() });
}

export async function markPaymentTimeout(idPay: string) {
  return updateRecord(idPay, { status: 'TIMEOUT' });
}

export async function getPayment(idPay: string) {
  return readRecord(idPay);
}

export async function hasPayment(idPay: string) {
  const record = await readRecord(idPay);
  return Boolean(record);
}

export async function resetPaymentsStore() {
  const sb = createServiceClient();
  await sb.from('settings').delete().like('key', `${KEY_PREFIX}%`);
}


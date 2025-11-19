import { Agent } from 'undici';
import { getApiKey } from '@/lib/api-keys';

const BASE_URL = (process.env.WEPAY_BASE_URL || 'https://www.wepay.in.th').replace(/\/$/, '');

type Credentials = {
  username: string;
  password: string;
};

export type WepayClientResponse = {
  code?: string;
  message?: string;
  [key: string]: any;
};

export type WepayOrderCreateResponse = WepayClientResponse & {
  bill_id?: number | string;
  transaction_id?: number | string;
  queue_id?: number | string;
  total_amount?: number | string;
  balance?: number | string;
};

export type WepayOrderOutput = {
  dest_ref?: string;
  transaction_id?: string;
  status?: string;
  operator_trxnsid?: string;
  sms?: string;
  [key: string]: string | undefined;
};

export class WepayError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly response?: WepayClientResponse;

  constructor(code: string, message: string, response?: WepayClientResponse, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.response = response;
  }
}

async function getCredentials(): Promise<Credentials> {
  const [username, password] = await Promise.all([
    getApiKey('WEPAY_USERNAME'),
    getApiKey('WEPAY_PASSWORD')
  ]);

  if (!username || !password) {
    throw new WepayError('missing_credentials', 'กรุณาตั้งค่า WEPAY_USERNAME และ WEPAY_PASSWORD ในระบบ');
  }

  return { username, password };
}

const ipv4Agent = new Agent({
  connect: {
    // บังคับให้เลือก IPv4 เท่านั้น (กรณีปลายทาง whitelist ตาม IP)
    family: 4,
    // hints = 0 เพื่อปิดการพยายามเลือก IPv6
    hints: 0,
  },
});

async function postClientApi(params: Record<string, string>): Promise<WepayClientResponse> {
  const creds = await getCredentials();
  const search = new URLSearchParams({
    username: creds.username,
    password: creds.password,
    ...Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, value ?? ''])
    ),
  });

  const init: RequestInit & { dispatcher?: Agent } = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: search.toString(),
    cache: 'no-store',
    dispatcher: ipv4Agent,
  };

  const res = await fetch(`${BASE_URL}/client_api.json.php`, init as RequestInit);

  const text = await res.text();
  let json: WepayClientResponse;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new WepayError('invalid_response', 'ไม่สามารถแปลงข้อมูลจาก wePAY ได้', { raw: text }, res.status);
  }

  if (!res.ok) {
    throw new WepayError('http_error', 'ไม่สามารถเชื่อมต่อ wePAY ได้', json, res.status);
  }

  return json;
}

function ensureSuccess(response: WepayClientResponse) {
  if (!response || response.code !== '00000') {
    throw new WepayError(response?.code || 'provider_error', response?.message || 'ทำรายการกับ wePAY ไม่สำเร็จ', response);
  }
}

export async function createGtopupOrder(input: {
  companyId: string;
  amount: number;
  ref1: string;
  ref2?: string;
  respUrl: string;
  destRef: string;
}): Promise<WepayOrderCreateResponse> {
  const payload: Record<string, string> = {
    type: 'gtopup',
    pay_to_company: input.companyId,
    pay_to_amount: Number(input.amount || 0).toFixed(2),
    pay_to_ref1: input.ref1.trim(),
    resp_url: input.respUrl,
    dest_ref: input.destRef,
  };

  if (input.ref2) {
    payload.pay_to_ref2 = input.ref2.trim();
  }

  const response = await postClientApi(payload);
  ensureSuccess(response);
  return response as WepayOrderCreateResponse;
}

export async function getWepayBalance() {
  const response = await postClientApi({ type: 'balance_inquiry' });
  ensureSuccess(response);
  return {
    ledger: response.ledger_balance ?? '0',
    available: response.available_balance ?? '0',
  };
}

export async function getWepayOrderOutput(transactionId: string): Promise<WepayOrderOutput | null> {
  const response = await postClientApi({
    type: 'get_output',
    transaction_id: transactionId,
  });
  ensureSuccess(response);
  const rawOutput = response.output;
  if (!rawOutput || typeof rawOutput !== 'string') return null;
  return parseOutputString(rawOutput);
}

export function parseOutputString(output: string): WepayOrderOutput {
  const params = new URLSearchParams(output);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

export function toWepayState(status?: string | number | null): { state: string; isTerminal: boolean } {
  const normalized = status == null ? null : String(status).trim();
  switch (normalized) {
    case '2':
      return { state: 'completed', isTerminal: true };
    case '4':
      return { state: 'failed', isTerminal: true };
    default:
      return { state: 'processing', isTerminal: false };
  }
}

export function generateDestRef(prefix = 'GT'): string {
  const base = `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return base.slice(0, 20);
}

export async function getWepayCredentials(): Promise<Credentials> {
  return getCredentials();
}



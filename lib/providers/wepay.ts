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
  
  // สร้าง parameters ตามลำดับที่ wePAY ต้องการ: username, password, แล้วตามด้วย params อื่นๆ
  const search = new URLSearchParams();
  search.append('username', creds.username);
  search.append('password', creds.password);
  
  // เพิ่ม params อื่นๆ ตามลำดับ
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      search.append(key, String(value));
    }
  }

  const bodyString = search.toString();
  
  // Debug log (ไม่ log password แต่ log username เพื่อตรวจสอบ)
  const debugParams = { ...params };
  if (debugParams.password) debugParams.password = '***';
  console.log('[wePAY] Request:', {
    url: `${BASE_URL}/client_api.json.php`,
    method: 'POST',
    contentType: 'application/x-www-form-urlencoded',
    username: creds.username ? `${creds.username.substring(0, 2)}***` : 'MISSING',
    hasPassword: !!creds.password,
    params: debugParams,
    bodyLength: bodyString.length,
    bodyPreview: bodyString.substring(0, 100) + (bodyString.length > 100 ? '...' : '')
  });

  const init: RequestInit & { dispatcher?: Agent } = {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: bodyString,
    cache: 'no-store',
    dispatcher: ipv4Agent,
  };

  const res = await fetch(`${BASE_URL}/client_api.json.php`, init as RequestInit);

  const text = await res.text();
  
  // ตรวจสอบกรณี Access Denied หรือ authentication error
  const textLower = text.toLowerCase();
  if (res.status === 401 || textLower.includes('access denied') || textLower.includes('unauthorized')) {
    console.error('[wePAY] Authentication failed - Status:', res.status, 'Response:', text.substring(0, 200));
    throw new WepayError('unauthorized', 'ไม่สามารถเข้าถึง wePAY API ได้ กรุณาตรวจสอบ username/password หรือ IP whitelist', { raw: text }, res.status);
  }
  
  let json: WepayClientResponse;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (err) {
    console.error('[wePAY] JSON parse error - Response:', text.substring(0, 200));
    throw new WepayError('invalid_response', `ไม่สามารถแปลงข้อมูลจาก wePAY ได้: ${text.substring(0, 100)}`, { raw: text }, res.status);
  }

  if (!res.ok) {
    console.error('[wePAY] HTTP error - Status:', res.status, 'Response:', text.substring(0, 200));
    throw new WepayError('http_error', `ไม่สามารถเชื่อมต่อ wePAY ได้ (${res.status}): ${text.substring(0, 100)}`, json, res.status);
  }

  console.log('[wePAY] Success - Response code:', json.code);
  return json;
}

function ensureSuccess(response: WepayClientResponse) {
  if (!response || response.code !== '00000') {
    // จัดการ error code 30007 (Invalid Payment Amount) ให้แสดงข้อความที่ชัดเจน
    if (response.code === '30007') {
      const desc = response.desc || response.message || 'Invalid Payment Amount';
      throw new WepayError(
        response.code,
        `จำนวนเงินไม่ถูกต้อง: ${desc}. กรุณาตรวจสอบจำนวนเงินที่ต้องการเติม`,
        response
      );
    }
    throw new WepayError(response?.code || 'provider_error', response?.message || response?.desc || 'ทำรายการกับ wePAY ไม่สำเร็จ', response);
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
  // Format amount: ถ้าเป็นจำนวนเต็มให้ส่งเป็นจำนวนเต็ม, ถ้าเป็นทศนิยมให้ส่งเป็นทศนิยม 2 ตำแหน่ง
  const amountNum = Number(input.amount || 0);
  const amountStr = amountNum % 1 === 0 
    ? String(amountNum) 
    : amountNum.toFixed(2);

  const payload: Record<string, string> = {
    type: 'gtopup',
    pay_to_company: input.companyId,
    pay_to_amount: amountStr,
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

export type WepayServiceInfo = {
  code?: string;
  service_name?: string;
  discount?: number;
  fee?: number;
  sof_min?: number;
  sof_max?: number;
  sof_defined_amounts?: number[];
  ref1?: { title?: string | null; min_length?: number | null; max_length?: number | null };
  ref2?: { title?: string | null; min_length?: number | null; max_length?: number | null };
  ref3?: { title?: string | null; min_length?: number | null; max_length?: number | null };
  ref4?: { title?: string | null; min_length?: number | null; max_length?: number | null };
  ref5?: { title?: string | null; min_length?: number | null; max_length?: number | null };
  ref6?: { title?: string | null; min_length?: number | null; max_length?: number | null };
};

export async function getWepayServiceInfo(
  type: 'gtopup' | 'mtopup' | 'cashcard',
  companyId: string
): Promise<WepayServiceInfo> {
  const response = await postClientApi({
    type,
    pay_to_company: companyId,
    payee_info: 'true',
  });
  ensureSuccess(response);
  return response as WepayServiceInfo;
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

export async function createMtopupOrder(input: {
  companyId: string;
  amount: number;
  phoneNumber: string;
  respUrl: string;
  destRef: string;
}): Promise<WepayOrderCreateResponse> {
  // ตามเอกสาร wePAY: username, password, resp_url, dest_ref, type, pay_to_amount, pay_to_company, pay_to_ref1
  // ลำดับตามเอกสาร: resp_url, dest_ref, type, pay_to_amount, pay_to_company, pay_to_ref1
  const payload: Record<string, string> = {
    resp_url: input.respUrl,
    dest_ref: input.destRef,
    type: 'mtopup',
    pay_to_amount: Number(input.amount || 0).toFixed(2),
    pay_to_company: input.companyId,
    pay_to_ref1: input.phoneNumber.trim(),
  };

  const response = await postClientApi(payload);
  ensureSuccess(response);
  return response as WepayOrderCreateResponse;
}

export async function createCashcardOrder(input: {
  companyId: string;
  amount: number;
  respUrl: string;
  destRef: string;
}): Promise<WepayOrderCreateResponse> {
  const payload: Record<string, string> = {
    type: 'cashcard',
    pay_to_company: input.companyId,
    pay_to_amount: Number(input.amount || 0).toFixed(2),
    pay_to_ref1: '0000000000',
    resp_url: input.respUrl,
    dest_ref: input.destRef,
  };

  const response = await postClientApi(payload);
  ensureSuccess(response);
  return response as WepayOrderCreateResponse;
}

export async function getWepayCredentials(): Promise<Credentials> {
  return getCredentials();
}

export type WepayRefundResponse = {
  code?: string;
  message?: string;
  refund_id?: string | number;
  [key: string]: any;
};

async function postMtopupRefundApi(params: Record<string, string>): Promise<string> {
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

  const res = await fetch(`${BASE_URL}/mtopup_refund_api.php`, init as RequestInit);
  const text = await res.text();

  if (!res.ok) {
    throw new WepayError('http_error', 'ไม่สามารถเชื่อมต่อ wePAY refund API ได้', { raw: text }, res.status);
  }

  return text.trim();
}

export async function createMtopupRefund(input: {
  transactionId: string;
  companyId: string;
  respUrl: string;
  destRef: string;
  newMsisdn?: string;
}): Promise<WepayRefundResponse> {
  const payload: Record<string, string> = {
    transaction_id: input.transactionId,
    pay_to_company: input.companyId,
    resp_url: input.respUrl,
    dest_ref: input.destRef,
  };

  if (input.newMsisdn) {
    payload.new_msisdn = input.newMsisdn.trim();
  }

  const response = await postMtopupRefundApi(payload);
  
  // Response format: "SUCCEED|RID=1234" or "ERROR|message"
  if (response.startsWith('SUCCEED|')) {
    const refundIdMatch = response.match(/RID=(\d+)/);
    return {
      code: '00000',
      refund_id: refundIdMatch ? refundIdMatch[1] : undefined,
      message: 'Refund request submitted successfully',
    };
  } else if (response.startsWith('ERROR|')) {
    const errorMsg = response.replace('ERROR|', '');
    throw new WepayError('refund_error', errorMsg, { raw: response });
  } else {
    throw new WepayError('invalid_response', 'ไม่สามารถแปลงข้อมูลจาก wePAY refund API ได้', { raw: response });
  }
}



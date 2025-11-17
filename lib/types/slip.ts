// ===== Request & Response Types =====

export interface VerifySlipRequest {
  qrPayload: string;
}

export interface VerifySlipResponse {
  success: boolean;
  data?: VerifySlipData;
  error?: string;
  debug?: VerifySlipDebug;
}

export interface VerifySlipData {
  message: string;
  pointsAdded: number;
  currentPoints: number;
  transactionAmount: number;
  minimumAmount: number;
}

export interface VerifySlipDebug {
  transactionId?: string | null;
  amount?: number;
  pointsAdded?: number;
  apiResult?: RDCWApiResponse;
  errorCode?: string;
  settings?: {
    minimumAmount: number;
  };
  details?: unknown;
}

// ===== RDCW API Types =====

export interface RDCWApiRequest {
  payload: string;
}

export interface RDCWApiResponse {
  valid: boolean;
  data?: RDCWSlipData;
  error?: string;
}

export interface RDCWSlipData {
  transRef?: string;
  ref1?: string;
  amount: number;
  sender: {
    account: {
      value: string;
    };
    name?: string;
  };
  receiver: {
    account: {
      value: string;
    };
    name?: string;
  };
  transactionDate?: string;
  transactionTime?: string;
}

// ===== Database Types =====

export interface SlipVerificationSettings {
  id: number;
  rdcw_client_id: string | null;
  rdcw_client_secret: string | null;
  rdcw_endpoint: string;
  minimum_topup_amount: number;
  created_at: string;
  updated_at: string;
}

export interface SlipHistory {
  id: number;
  user_id: number;
  transaction_id: string | null;
  amount: number;
  points_added: number;
  qr_payload: string;
  status: 'success' | 'failed' | 'pending';
  error_message: string | null;
  rdcw_response: any | null;
  created_at: string;
}

// ===== Validation Types =====

export interface AccountValidationResult {
  isValid: boolean;
  matchedPositions: number[];
  totalPositions: number;
  validPositions: number;
}

// ===== Error Types =====

export class SlipVerificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public debugData?: unknown
  ) {
    super(message);
    this.name = 'SlipVerificationError';
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_QR: 'INVALID_QR',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_ACCOUNT: 'INVALID_ACCOUNT',
  DUPLICATE_SLIP: 'DUPLICATE_SLIP',
  API_ERROR: 'API_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;


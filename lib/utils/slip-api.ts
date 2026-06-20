import { 
  RDCWApiRequest, 
  RDCWApiResponse,
  SlipOKApiRequest,
  SlipOKApiResponse,
  SlipOKSlipData,
} from '@/lib/types/slip';

export async function verifySlipWithRDCW(
  qrPayload: string,
  endpoint: string,
  clientId: string,
  clientSecret: string
): Promise<RDCWApiResponse> {
  if (!endpoint || !clientId || !clientSecret) {
    throw new Error('RDCW API configuration is missing');
  }

  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64'
  );

  const requestBody: RDCWApiRequest = {
    payload: qrPayload,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RDCW API Error:', {
        status: response.status,
        body: errorText,
      });
      
      throw new Error(
        `API Error: HTTP ${response.status} - ${errorText}`
      );
    }

    const data: RDCWApiResponse = await response.json();
    return data;
    
  } catch (error) {
    console.error('Error calling RDCW API:', error);
    throw error;
  }
}

export async function verifySlipWithSlipOK(
  qrPayload: string,
  branchId: string,
  apiKey: string,
  amount?: number
): Promise<SlipOKApiResponse> {
  if (!branchId || !apiKey) {
    throw new Error('SlipOK API configuration is missing');
  }

  const endpoint = `https://api.slipok.com/api/line/apikey/${branchId}`;

  const requestBody: SlipOKApiRequest = {
    data: qrPayload,
    log: true,
  };

  if (amount !== undefined) {
    requestBody.amount = amount;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-authorization': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();

    if (!response.ok) {
      // SlipOK returns error codes in the response body
      const errorCode = responseData.code || response.status;
      const errorMessage = responseData.message || `HTTP ${response.status}`;
      
      console.error('SlipOK API Error:', {
        status: response.status,
        code: errorCode,
        message: errorMessage,
        body: responseData,
      });
      
      // Return error response with data if available (for duplicate slip, etc.)
      return {
        success: false,
        code: errorCode,
        message: errorMessage,
        data: responseData.data || undefined,
      };
    }

    // Success response
    return {
      success: true,
      data: responseData.data,
    };
    
  } catch (error) {
    console.error('Error calling SlipOK API:', error);
    throw error;
  }
}

// Helper function to normalize SlipOK response to common format
export function normalizeSlipOKResponse(slipOKData: SlipOKSlipData): {
  transRef: string;
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
} {
  return {
    transRef: slipOKData.transRef,
    ref1: slipOKData.ref1,
    amount: slipOKData.amount,
    sender: {
      account: {
        value: slipOKData.sender.account.value,
      },
      name: slipOKData.sender.displayName || slipOKData.sender.name,
    },
    receiver: {
      account: {
        value: slipOKData.receiver.account.value,
      },
      name: slipOKData.receiver.displayName || slipOKData.receiver.name,
    },
    transactionDate: slipOKData.transDate,
    transactionTime: slipOKData.transTime,
  };
}


import { RDCWApiRequest, RDCWApiResponse } from '@/lib/types/slip';

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


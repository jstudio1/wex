import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-keys';
import { z } from 'zod';
import { getWepayBalance, getWepayCredentials } from '@/lib/providers/wepay';

const getBalanceSchema = z.object({
  key_name: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  
  // ตรวจสอบว่าเป็น admin หรือไม่
  const { data: userData } = await sb
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = getBalanceSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', detail: parsed.error.issues }, { status: 400 });
    }

    const { key_name } = parsed.data;

    if (key_name === 'SOCIAL_API_KEY') {
      // ดึง balance จาก social API
      const apiKey = await getApiKey('SOCIAL_API_KEY');
      if (!apiKey) {
        return NextResponse.json({ error: 'missing_api_key' }, { status: 500 });
      }

      const formData = new URLSearchParams();
      formData.append('key', apiKey);
      formData.append('action', 'balance');

      const res = await fetch('https://socialpanel24.com/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      if (!res.ok) {
        return NextResponse.json({ error: 'provider_error', detail: 'ไม่สามารถดึงข้อมูล balance ได้' }, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json({ 
        ok: true, 
        data: {
          balance: data.balance || '0',
          currency: data.currency || 'THB',
          status: data.status
        }
      });
    } else if (key_name === 'WEPAY_USERNAME' || key_name === 'WEPAY_PASSWORD') {
      const [{ ledger, available }, creds] = await Promise.all([
        getWepayBalance(),
        getWepayCredentials()
      ]);
      return NextResponse.json({ 
        ok: true, 
        data: {
          balance: available,
          ledger_balance: ledger,
          username: creds.username,
          currency: 'THB'
        }
      });
    } else if (key_name === 'peamsubapi') {
      // ดึง balance จาก Peamsub API
      const apiKey = await getApiKey('peamsubapi');
      if (!apiKey) {
        return NextResponse.json({ error: 'missing_api_key' }, { status: 500 });
      }

      // Encode API key ด้วย Base64
      const encodedKey = Buffer.from(apiKey).toString('base64');

      const res = await fetch('https://api.peamsub24hr.com/v2/user/inquiry', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${encodedKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        return NextResponse.json({ error: 'provider_error', detail: 'ไม่สามารถดึงข้อมูล balance ได้' }, { status: res.status });
      }

      const data = await res.json();
      
      if (data.statusCode !== 200 || !data.data) {
        return NextResponse.json({ error: 'provider_error', detail: data.message || 'ไม่สามารถดึงข้อมูล balance ได้' }, { status: 502 });
      }

      // แปลง rank เป็น text
      const rankText = data.data.rank === 1 ? 'ตัวแทนจำหน่าย' : data.data.rank === 3 ? 'ตัวแทน VIP' : `Rank ${data.data.rank}`;

      return NextResponse.json({ 
        ok: true, 
        data: {
          balance: data.data.balance || '0.00',
          currency: 'THB',
          username: data.data.username,
          rank: data.data.rank,
          rankText: rankText
        }
      });
    } else if (key_name === 'OTP24HR_API_KEY') {
      // ดึง balance จาก OTP24HR API
      const apiKey = await getApiKey('OTP24HR_API_KEY');
      if (!apiKey) {
        return NextResponse.json({ error: 'missing_api_key' }, { status: 500 });
      }

      const formData = new URLSearchParams();
      formData.append('keyapi', apiKey);

      const res = await fetch('https://otp24hr.com/api/v1?action=balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      if (!res.ok) {
        return NextResponse.json({ error: 'provider_error', detail: 'ไม่สามารถดึงข้อมูล balance ได้' }, { status: res.status });
      }

      const data = await res.json();
      
      if (data.status !== 'success') {
        return NextResponse.json({ error: 'provider_error', detail: data.msg || 'ไม่สามารถดึงข้อมูล balance ได้' }, { status: 502 });
      }

      // Parse balance - ลบ "บาท" และ whitespace ออก
      let balanceValue = data.balance || '0';
      if (typeof balanceValue === 'string') {
        balanceValue = balanceValue.replace(/บาท/g, '').replace(/\s/g, '').trim();
      }
      const balanceNum = Number(balanceValue) || 0;

      return NextResponse.json({ 
        ok: true, 
        data: {
          balance: String(balanceNum),
          currency: 'THB',
          status: data.status
        }
      });
    } else {
      return NextResponse.json({ error: 'unsupported_key', detail: 'API key นี้ยังไม่รองรับการดึง balance' }, { status: 400 });
    }
  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json({ error: 'unexpected', detail: (error as Error).message }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-keys';

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  
  const { data: userData } = await sb
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get('provider_id');

    if (!providerId) {
      return NextResponse.json({ error: 'invalid_payload', detail: 'กรุณาระบุ provider_id' }, { status: 400 });
    }

    // ดึง provider
    const { data: provider, error: providerError } = await sb
      .from('social_providers')
      .select('*')
      .eq('id', parseInt(providerId))
      .eq('is_active', true)
      .single();

    if (providerError || !provider) {
      return NextResponse.json({ error: 'provider_not_found', detail: 'ไม่พบ provider หรือ provider ถูกปิดใช้งาน' }, { status: 404 });
    }

    const apiKey = await getApiKey(provider.api_key_name);
    if (!apiKey) {
      return NextResponse.json({ error: 'missing_api_key', detail: `ไม่พบ API key สำหรับ ${provider.name}` }, { status: 500 });
    }

    // ดึง balance จาก provider API
    // socialpanel24.com และ API อื่นๆ มักใช้ action=balance
    const body = new URLSearchParams({ key: apiKey, action: 'balance' });
    const response = await fetch(provider.api_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const json = await response.json();

    // API return balance ในรูปแบบ: { "balance": "100.84292", "currency": "USD" }
    // หรืออาจจะเป็นรูปแบบอื่นๆ เช่น { balance: 100.00 } หรือ { funds: "100.00" }
    let balance: number | null = null;
    let currency: string = 'THB';
    
    if (typeof json === 'object' && json !== null) {
      // รองรับรูปแบบมาตรฐาน: { balance: "100.84292", currency: "USD" }
      if (json.balance !== undefined && json.balance !== null) {
        if (typeof json.balance === 'number') {
          balance = json.balance;
        } else if (typeof json.balance === 'string') {
          // ลบ comma และ parse เป็น number
          const cleaned = json.balance.replace(/,/g, '').trim();
          balance = parseFloat(cleaned);
          if (!Number.isFinite(balance)) {
            balance = null;
          }
        }
      }
      
      // รองรับรูปแบบอื่นๆ
      if (balance === null) {
        if (typeof json.funds === 'number') {
          balance = json.funds;
        } else if (typeof json.funds === 'string') {
          const cleaned = json.funds.replace(/,/g, '').trim();
          balance = parseFloat(cleaned);
          if (!Number.isFinite(balance)) {
            balance = null;
          }
        } else if (typeof json.credit === 'number') {
          balance = json.credit;
        } else if (typeof json.credit === 'string') {
          const cleaned = json.credit.replace(/,/g, '').trim();
          balance = parseFloat(cleaned);
          if (!Number.isFinite(balance)) {
            balance = null;
          }
        }
      }
      
      // ดึง currency ถ้ามี
      if (json.currency && typeof json.currency === 'string') {
        currency = json.currency.toUpperCase();
      }
    }

    if (balance === null) {
      return NextResponse.json({ 
        ok: false, 
        balance: null, 
        detail: 'ไม่สามารถดึง balance ได้ หรือ API ไม่รองรับ',
        raw_response: json 
      });
    }

    return NextResponse.json({ 
      ok: true, 
      balance,
      currency,
      provider: { id: provider.id, name: provider.name }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json({ error: 'unexpected', detail: 'เกิดข้อผิดพลาดในการดึง balance' }, { status: 500 });
  }
}


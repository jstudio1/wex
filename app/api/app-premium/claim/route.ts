import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-keys';
import { z } from 'zod';

const API_URL = 'https://api.peamsub24hr.com/v2/app-premium/claim';

const claimSchema = z.object({
  order_id: z.number().int().min(1),
  status: z.enum(['wrong_password', 'incorrect_pin', 'youtube_premium_disconnect', 'netflix_screen_disconnect', 'others']),
  description: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const apiKey = await getApiKey('peamsubapi');
  if (!apiKey) return NextResponse.json({ error: 'missing_peamsub_api_key' }, { status: 500 });

  try {
    const body = await req.json();
    const parsed = claimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', detail: parsed.error.flatten() }, { status: 400 });
    }

    const { order_id, status, description } = parsed.data;

    const sb = createServiceClient();

    // ตรวจสอบว่า order เป็นของ user นี้หรือไม่
    const { data: order, error: orderError } = await sb
      .from('app_premium_orders')
      .select('id, reference, external_reference, user_id, status, raw_response, app_premium_products(id, display_name)')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
    }

    // ตรวจสอบว่า order status เป็น completed หรือไม่ (เคลมได้แค่ order ที่สำเร็จแล้ว)
    if (order.status !== 'completed') {
      return NextResponse.json({ 
        error: 'invalid_order_status', 
        detail: 'สามารถเคลมได้เฉพาะสินค้าที่ซื้อสำเร็จแล้วเท่านั้น' 
      }, { status: 400 });
    }

    const reference = order.reference || order.external_reference;
    if (!reference) {
      return NextResponse.json({ error: 'missing_reference' }, { status: 400 });
    }

    // Encode API key ด้วย Base64
    const encodedKey = Buffer.from(apiKey).toString('base64');

    // ดึง URL จาก request headers เพื่อสร้าง callback URL (รองรับการเปลี่ยน domain โดยไม่ต้องเปลี่ยน env)
    let callbackUrl: string;
    try {
      // ดึง host และ protocol จาก headers (รองรับ production และ development)
      const host = req.headers.get('host');
      const forwardedProto = req.headers.get('x-forwarded-proto');
      const protocol = forwardedProto || (host?.includes('localhost') ? 'http' : 'https');
      
      if (host) {
        callbackUrl = `${protocol}://${host}/api/app-premium/claim/callback`;
      } else {
        // Fallback: ใช้ environment variable
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                       process.env.NEXT_PUBLIC_BASE_URL || 
                       'http://localhost:3000';
        callbackUrl = `${siteUrl}/api/app-premium/claim/callback`;
      }
    } catch (error) {
      // Fallback ถ้ามีปัญหา: ใช้ environment variable หรือ default
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                     process.env.NEXT_PUBLIC_BASE_URL || 
                     'http://localhost:3000';
      callbackUrl = `${siteUrl}/api/app-premium/claim/callback`;
    }

    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: reference,
        status: status,
        description: description,
        callbackUrl: callbackUrl
      })
    });

    const responseJson = await upstream.json();

    // ถ้า API ล้มเหลว
    if (!upstream.ok || responseJson.statusCode !== 200 || !responseJson.data) {
      console.error('Peamsub claim API error:', {
        status: upstream.status,
        statusText: upstream.statusText,
        response: responseJson
      });
      return NextResponse.json({ 
        error: 'provider_error', 
        detail: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' 
      }, { status: 502 });
    }

    const ticketId = responseJson.data.ticketId;

    // อัพเดท order status เป็น 'claimed' และบันทึก ticket_id ใน raw_response
    const currentRawResponse = (order as any).raw_response || {};
    
    const { error: updateError } = await sb
      .from('app_premium_orders')
      .update({
        status: 'claimed',
        raw_response: {
          ...currentRawResponse,
          claim: {
            ticketId: ticketId,
            status: status,
            description: description,
            claimedAt: new Date().toISOString(),
            callbackUrl: callbackUrl  // เก็บ callback URL ไว้เพื่อตรวจสอบ
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id);

    if (updateError) {
      console.error('Update order claim error:', updateError);
      return NextResponse.json({ error: 'db_error', detail: 'ไม่สามารถบันทึกข้อมูลเคลมได้' }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      ticketId: ticketId,
      message: 'ส่งคำขอเคลมเรียบร้อยแล้ว กรุณารอการตรวจสอบจากทีมงาน'
    });
  } catch (error) {
    console.error('App premium claim error:', error);
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งภายหลัง' 
    }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * Webhook endpoint สำหรับรับการแจ้งเตือนเมื่อสถานะออเดอร์เปลี่ยน
 * External API จะส่ง POST request มายัง endpoint นี้เมื่อสถานะออเดอร์เปลี่ยน
 * 
 * ข้อมูลที่ส่งมาจะมีโครงสร้างเหมือนกับ response ของ GET /agent/orders/{transactionId}
 * 
 * @see https://x.24payseller.com/agent/orders/{transactionId}
 */
export async function POST(req: Request) {
  // ตรวจสอบ webhook secret (ถ้า External API ต้องการ authentication)
  const secret = req.headers.get('x-webhook-secret');
  if (secret && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // ตาม API documentation ข้อมูลจะถูกส่งมาโดยตรง (ไม่ใช่ nested ใน order object)
    // แต่รองรับทั้ง 2 แบบเพื่อความปลอดภัย
    const orderData = body.order || body;
    
    const transactionId: string | undefined = orderData?.transactionId;
    if (!transactionId) {
      return NextResponse.json({ error: 'bad_payload', detail: 'Missing transactionId' }, { status: 400 });
    }

    const sb = createServiceClient();
    
    // อัพเดทข้อมูลออเดอร์ใน database
    // ข้อมูลที่รับมาจะมีโครงสร้างเหมือนกับ GET /agent/orders/{transactionId}
    const updateData: {
      state?: string;
      result_code?: string | null;
      finished_at?: string | null;
      updated_at: string;
      // สามารถเก็บข้อมูลเพิ่มเติมใน future ได้ เช่น price, input, productMetadata
    } = {
      updated_at: new Date().toISOString()
    };

    // อัพเดท state ถ้ามี
    if (orderData.state) {
      updateData.state = orderData.state;
    }

    // อัพเดท result_code ถ้ามี
    if (orderData.result_code !== undefined) {
      updateData.result_code = orderData.result_code || null;
    }

    // อัพเดท finished_at ถ้ามี
    if (orderData.finishedAt) {
      updateData.finished_at = orderData.finishedAt;
    }

    const { error } = await sb
      .from('orders')
      .update(updateData)
      .eq('transaction_id', transactionId);

    if (error) {
      console.error('Webhook update error:', error);
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'unexpected', detail: (error as Error).message }, { status: 500 });
  }
}




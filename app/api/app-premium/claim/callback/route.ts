import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// Callback endpoint สำหรับรับ callback จาก Peamsub เมื่อเคลมแก้ไขแล้ว
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ticketId, status, prize } = body;

    if (!ticketId || !status) {
      return NextResponse.json({ statusCode: 400, error: 'missing_required_fields' }, { status: 400 });
    }

    const sb = createServiceClient();

    // หา order ที่มี ticketId ใน raw_response.claim.ticketId
    // หรืออาจจะต้องสร้างตาราง claims แยก
    // ตอนนี้จะค้นหาจาก raw_response ที่มี claim.ticketId
    const { data: orders, error: fetchError } = await sb
      .from('app_premium_orders')
      .select('id, raw_response')
      .eq('status', 'claimed');

    if (fetchError) {
      return NextResponse.json({ statusCode: 500, error: 'db_error' }, { status: 500 });
    }

    // หา order ที่ตรงกับ ticketId
    let targetOrder = null;
    if (orders) {
      for (const order of orders) {
        const rawResponse = order.raw_response as any;
        if (rawResponse?.claim?.ticketId === ticketId) {
          // ดึงข้อมูล order เต็มๆ เพื่อเก็บ product_data เดิมไว้
          const { data: fullOrder } = await sb
            .from('app_premium_orders')
            .select('id, product_data, raw_response')
            .eq('id', order.id)
            .single();
          targetOrder = fullOrder || order;
          break;
        }
      }
    }

    if (!targetOrder) {
      return NextResponse.json({ statusCode: 200 }); // Return 200 anyway to acknowledge callback
    }

    // อัพเดท order ตามสถานะเคลม
    // ถ้า status = 'success' แสดงว่าเคลมสำเร็จแล้ว
    const newStatus = status === 'success' ? 'completed' : 'failed';
    
    const currentRawResponse = (targetOrder.raw_response as any) || {};
    const originalProductData = (targetOrder as any).product_data;
    
    // เก็บข้อมูลเดิมไว้ใน raw_response ก่อนอัพเดท (ถ้ายังไม่มี)
    if (!currentRawResponse.originalProductData && originalProductData) {
      currentRawResponse.originalProductData = originalProductData;
    }
    
    const updatedRawResponse = {
      ...currentRawResponse,
      claim: {
        ...(currentRawResponse.claim || {}),
        callbackStatus: status,
        callbackPrize: prize,
        callbackAt: new Date().toISOString()
      }
    };

    // ถ้าเคลมสำเร็จและมี prize (ข้อมูลใหม่) ให้อัพเดท product_data ด้วย
    const updateData: Record<string, unknown> = {
      status: newStatus,
      raw_response: updatedRawResponse,
      updated_at: new Date().toISOString()
    };

    // ถ้าเคลมสำเร็จและมี prize ให้อัพเดท product_data ด้วยข้อมูลใหม่
    if (status === 'success' && prize) {
      updateData.product_data = prize;
    }

    const { error: updateError } = await sb
      .from('app_premium_orders')
      .update(updateData)
      .eq('id', targetOrder.id);

    if (updateError) {
      return NextResponse.json({ statusCode: 500, error: 'db_error' }, { status: 500 });
    }

    return NextResponse.json({ statusCode: 200 });
  } catch (error) {
    return NextResponse.json({ statusCode: 500, error: 'unexpected' }, { status: 500 });
  }
}


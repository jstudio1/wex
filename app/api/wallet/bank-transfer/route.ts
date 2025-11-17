import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const amount = parseFloat(formData.get('amount') as string);
    const bankIndex = parseInt(formData.get('bank_index') as string, 10);
    const transferDate = formData.get('transfer_date') as string;
    const transferTime = formData.get('transfer_time') as string;
    const transferRef = formData.get('transfer_ref') as string;
    const transferSlip = formData.get('transfer_slip') as File | null;

    // Validate
    if (!amount || amount <= 0 || amount > 100000) {
      return NextResponse.json(
        { error: 'invalid_amount', message: 'จำนวนเงินต้องอยู่ระหว่าง 1 - 100,000 บาท' },
        { status: 400 }
      );
    }

    if (!transferDate || !transferTime) {
      return NextResponse.json(
        { error: 'missing_datetime', message: 'กรุณาระบุวันที่และเวลาที่โอน' },
        { status: 400 }
      );
    }

    if (!transferSlip) {
      return NextResponse.json(
        { error: 'missing_slip', message: 'กรุณาอัปโหลดสลิปการโอน' },
        { status: 400 }
      );
    }

    // Validate file size (5MB)
    if (transferSlip.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'file_too_large', message: 'ไฟล์ขนาดไม่เกิน 5 MB' },
        { status: 400 }
      );
    }

    // Convert file to base64 for storage
    const arrayBuffer = await transferSlip.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    const sb = createServiceClient();

    // Save bank transfer request to database
    const { data, error } = await sb
      .from('bank_transfers')
      .insert({
        user_id: user.id,
        amount,
        bank_index: bankIndex,
        transfer_date: transferDate,
        transfer_time: transferTime,
        transfer_ref: transferRef || null,
        transfer_slip_base64: base64,
        transfer_slip_filename: transferSlip.name,
        status: 'pending', // pending, approved, rejected
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Bank transfer insert error:', error);
      return NextResponse.json(
        { error: 'db_error', message: 'บันทึกข้อมูลไม่สำเร็จ' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'ส่งคำขอเติมพอยต์สำเร็จ ระบบกำลังตรวจสอบ',
      transfer_id: data.id,
    });
  } catch (error) {
    console.error('Bank transfer route error:', error);
    const msg = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: 'server_error', message: msg }, { status: 500 });
  }
}


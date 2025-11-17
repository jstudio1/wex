import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const tx = searchParams.get('tx');
    if (!tx) return NextResponse.json({ error: 'tx_required' }, { status: 400 });

    const sb = createServiceClient();

    // ตรวจสอบว่า user เป็นเจ้าของออเดอร์
    const { data: order, error: orderErr } = await sb
      .from('orders')
      .select('transaction_id, created_at, updated_at, finished_at, state')
      .eq('transaction_id', tx)
      .eq('user_id', user.id)
      .maybeSingle();

    if (orderErr) return NextResponse.json({ error: 'db_error', detail: orderErr.message }, { status: 500 });
    if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // ลองดึงจากตาราง logs ถ้ามี
    let logs: { state: string | null; message: string | null; created_at: string }[] = [];
    try {
      const { data } = await sb
        .from('order_status_logs')
        .select('state, message, created_at')
        .eq('transaction_id', tx)
        .order('created_at', { ascending: false });
      logs = (data || []) as any;
    } catch {
      // ถ้าไม่มีตาราง ให้สร้างจากฟิลด์ที่มี
    }

    if (!logs.length) {
      // สร้างเหตุการณ์แบบประมาณการจากฟิลด์หลัก
      const items: { state: string; message: string | null; created_at: string }[] = [];
      if (order.created_at) items.push({ state: 'pending', message: 'รอดำเนินการ', created_at: order.created_at });
      if (order.updated_at && order.updated_at !== order.created_at) items.push({ state: 'processing', message: 'กำลังดำเนินการ', created_at: order.updated_at });
      if (order.finished_at) items.push({ state: order.state, message: null, created_at: order.finished_at });
      // เรียงล่าสุดอยู่บนสุด
      logs = items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return NextResponse.json({ ok: true, data: logs });
  } catch (err) {
    console.error('timeline error', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}



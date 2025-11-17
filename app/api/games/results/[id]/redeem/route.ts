import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const resultId = parseInt(params.id);
    if (isNaN(resultId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const sb = createServiceClient();

    // ดึงข้อมูลผลลัพธ์
    const { data: result, error: resultError } = await sb
      .from('game_results')
      .select('*')
      .eq('id', resultId)
      .eq('user_id', user.id)
      .single();

    if (resultError || !result) {
      return NextResponse.json({ error: 'result_not_found' }, { status: 404 });
    }

    if (result.status !== 'pending') {
      return NextResponse.json({ 
        error: 'already_redeemed',
        message: 'รางวัลนี้ถูกใช้ไปแล้ว' 
      }, { status: 400 });
    }

    if (result.prize_type === 'points') {
      return NextResponse.json({ 
        error: 'invalid_prize_type',
        message: 'รางวัลพอยต์ถูกเพิ่มไปแล้วอัตโนมัติ' 
      }, { status: 400 });
    }

    // อัพเดทสถานะ
    const { error: updateError } = await sb
      .from('game_results')
      .update({ status: 'redeemed' })
      .eq('id', resultId);

    if (updateError) {
      return NextResponse.json({ error: 'db_error', details: updateError.message }, { status: 500 });
    }

    // บันทึกการแลกรางวัล
    await sb
      .from('game_redemptions')
      .insert({
        result_id: resultId,
        user_id: user.id,
        coupon_id: result.coupon_id || null,
      });

    return NextResponse.json({ ok: true, data: { ...result, status: 'redeemed' } });
  } catch (err) {
    console.error('Redeem prize error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}








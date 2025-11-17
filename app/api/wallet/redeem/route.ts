import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { logTopupToDiscord } from '@/lib/discord';
import { z } from 'zod';

const redeemSchema = z.object({
  code: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const { code } = parsed.data;
    const sb = createServiceClient();

    // ดึงข้อมูล redeem code
    const { data: redeemCode, error: findError } = await sb
      .from('redeem_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (findError || !redeemCode) {
      return NextResponse.json({ 
        error: 'code_not_found', 
        message: 'ไม่พบโค้ดนี้หรือโค้ดนี้ถูกปิดใช้งาน' 
      }, { status: 404 });
    }

    const now = new Date();
    const validFrom = new Date(redeemCode.valid_from);
    const validUntil = redeemCode.valid_until ? new Date(redeemCode.valid_until) : null;

    // ตรวจสอบวันหมดอายุ
    if (now < validFrom) {
      return NextResponse.json({ 
        error: 'code_not_started', 
        message: `โค้ดนี้ยังไม่เปิดใช้งาน เริ่มใช้ได้วันที่ ${validFrom.toLocaleDateString('th-TH')}` 
      }, { status: 400 });
    }

    if (validUntil && now > validUntil) {
      return NextResponse.json({ 
        error: 'code_expired', 
        message: 'โค้ดนี้หมดอายุแล้ว' 
      }, { status: 400 });
    }

    // ตรวจสอบจำนวนครั้งที่ใช้
    if (redeemCode.usage_limit !== null && redeemCode.used_count >= redeemCode.usage_limit) {
      return NextResponse.json({ 
        error: 'code_limit_reached', 
        message: 'โค้ดนี้ถูกใช้ครบจำนวนแล้ว' 
      }, { status: 400 });
    }

    // ตรวจสอบว่าผู้ใช้ใช้โค้ดนี้แล้วหรือยัง
    const { data: existingUsage } = await sb
      .from('redeem_code_usage')
      .select('id')
      .eq('code_id', redeemCode.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingUsage) {
      return NextResponse.json({ 
        error: 'already_redeemed', 
        message: 'คุณใช้โค้ดนี้ไปแล้ว' 
      }, { status: 400 });
    }

    // เพิ่มพอยต์ให้ผู้ใช้
    const points = Number(redeemCode.points);
    const { error: creditError } = await sb.rpc('wallet_credit', { 
      u: user.id, 
      amt: points 
    });

    if (creditError) {
      return NextResponse.json({ error: 'db_error', details: creditError.message }, { status: 500 });
    }

    // อัปเดต used_count
    await sb
      .from('redeem_codes')
      .update({ 
        used_count: redeemCode.used_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', redeemCode.id);

    // บันทึกการใช้งาน
    await sb
      .from('redeem_code_usage')
      .insert({
        code_id: redeemCode.id,
        user_id: user.id,
        points: points,
      });

    // ส่ง Discord webhook log
    try {
      await logTopupToDiscord({
        username: user.username,
        userId: user.id,
        amount: points,
        method: 'redeem',
        reference: code.toUpperCase(),
      });
    } catch (err) {
      console.error('Discord webhook error:', err);
      // ไม่ throw error
    }

    return NextResponse.json({ 
      success: true, 
      points: points,
      message: `รับพอยต์ ${points.toFixed(2)} สำเร็จ!`
    });
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const topupSchema = z.object({
  points: z.number().positive(),
  note: z.string().max(500).nullable().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const currentUser = await getAuthUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const userId = Number(params.id);
    const body = await req.json();
    const parsed = topupSchema.parse(body);

    const sb = createServiceClient();

    // ตรวจสอบว่ามีผู้ใช้หรือไม่
    const { data: existingUser, error: fetchError } = await sb
      .from('users')
      .select('id, points')
      .eq('id', userId)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    // อัปเดต points ของผู้ใช้
    const newPoints = Number(existingUser.points || 0) + parsed.points;
    const { error: updateError } = await sb
      .from('users')
      .update({ points: newPoints })
      .eq('id', userId);

    if (updateError) {
      console.error('[POST /api/admin/users/[id]/topup] Update points error:', updateError);
      return NextResponse.json(
        { error: 'db_error', details: updateError.message },
        { status: 500 }
      );
    }

    // บันทึกประวัติการเติมเงิน (amount = points เพราะเป็นอันเดียวกัน)
    const { error: historyError } = await sb
      .from('admin_topup_history')
      .insert({
        user_id: userId,
        admin_id: currentUser.id,
        amount: parsed.points, // ใช้พอยต์เป็นจำนวนเงินด้วย (เป็นอันเดียวกัน)
        points_added: parsed.points,
        note: parsed.note || null,
      });

    if (historyError) {
      console.error('[POST /api/admin/users/[id]/topup] Insert history error:', historyError);
      // ไม่ return error เพราะ points ถูกอัปเดตแล้ว
    }

    return NextResponse.json({
      success: true,
      message: 'เพิ่มยอดเติมเงินสำเร็จ',
      newPoints,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error('[POST /api/admin/users/[id]/topup] Validation error:', err.issues);
      return NextResponse.json(
        {
          error: 'validation_error',
          details: err.issues,
          message: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่ส่งมา',
        },
        { status: 400 }
      );
    }
    console.error('[POST /api/admin/users/[id]/topup] Unexpected error:', err);
    return NextResponse.json(
      { error: 'unexpected', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

// DELETE - ลบบริการทั้งหมด หรือลบบริการที่ไม่เผยแพร่
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { unpublished_only } = body; // ถ้าเป็น true = ลบเฉพาะที่ไม่เผยแพร่

    const sb = createServiceClient();
    
    // ดึงจำนวนก่อนลบ
    let countQuery = sb.from('social_services').select('id', { count: 'exact', head: true });
    
    if (unpublished_only) {
      // นับเฉพาะบริการที่ไม่เผยแพร่
      countQuery = countQuery.eq('is_published', false);
    }

    const { count: countBeforeDelete } = await countQuery;

    // ลบบริการ
    let deleteQuery = sb.from('social_services').delete();
    
    if (unpublished_only) {
      // ลบเฉพาะบริการที่ไม่เผยแพร่
      deleteQuery = deleteQuery.eq('is_published', false);
    }

    const { error } = await deleteQuery.neq('id', 0); // ลบทั้งหมด

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      deleted_count: countBeforeDelete || 0,
      message: unpublished_only 
        ? `ลบบริการที่ไม่เผยแพร่ ${countBeforeDelete || 0} รายการสำเร็จ` 
        : `ลบบริการทั้งหมด ${countBeforeDelete || 0} รายการสำเร็จ`
    });
  } catch (error) {
    console.error('Delete services bulk error:', error);
    return NextResponse.json({ error: 'unexpected', detail: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ' }, { status: 500 });
  }
}

// PUT - เผยแพร่/ปิดเผยแพร่บริการทั้งหมด
export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { is_published } = body;

    if (typeof is_published !== 'boolean') {
      return NextResponse.json({ error: 'invalid_payload', detail: 'กรุณาระบุ is_published เป็น boolean' }, { status: 400 });
    }

    const sb = createServiceClient();
    
    // ดึงจำนวนก่อนอัพเดท
    const { count: countBeforeUpdate } = await sb
      .from('social_services')
      .select('id', { count: 'exact', head: true });

    // อัพเดทสถานะ
    const { error } = await sb
      .from('social_services')
      .update({ is_published })
      .neq('id', 0); // อัพเดททั้งหมด

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      updated_count: countBeforeUpdate || 0,
      message: is_published 
        ? `เผยแพร่บริการทั้งหมด ${countBeforeUpdate || 0} รายการสำเร็จ` 
        : `ปิดเผยแพร่บริการทั้งหมด ${countBeforeUpdate || 0} รายการสำเร็จ`
    });
  } catch (error) {
    console.error('Update services bulk error:', error);
    return NextResponse.json({ error: 'unexpected', detail: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ' }, { status: 500 });
  }
}


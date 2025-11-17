import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

// DELETE - ลบหมวดหมู่ทั้งหมด
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const sb = createServiceClient();
    
    // ตรวจสอบว่ามี services ที่ใช้ categories อยู่หรือไม่
    const { count: servicesCount } = await sb
      .from('social_services')
      .select('id', { count: 'exact', head: true })
      .not('category_id', 'is', null);

    if (servicesCount && servicesCount > 0) {
      return NextResponse.json({ 
        error: 'cannot_delete', 
        detail: `ไม่สามารถลบหมวดหมู่ได้ เนื่องจากมีบริการที่ใช้หมวดหมู่อยู่ ${servicesCount} รายการ กรุณาลบบริการก่อน` 
      }, { status: 400 });
    }

    // ดึงจำนวนก่อนลบ
    const { count: countBeforeDelete } = await sb
      .from('social_categories')
      .select('id', { count: 'exact', head: true });

    // ลบหมวดหมู่ทั้งหมด
    const { error } = await sb
      .from('social_categories')
      .delete()
      .neq('id', 0); // ลบทั้งหมด

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      deleted_count: countBeforeDelete || 0,
      message: `ลบหมวดหมู่ทั้งหมด ${countBeforeDelete || 0} รายการสำเร็จ`
    });
  } catch (error) {
    console.error('Delete categories bulk error:', error);
    return NextResponse.json({ error: 'unexpected', detail: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ' }, { status: 500 });
  }
}


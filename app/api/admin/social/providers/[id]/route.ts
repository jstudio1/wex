import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  
  const { data: userData } = await sb
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, api_url, api_key_name, is_active } = body;
    const { id } = await params;
    const providerId = parseInt(id);

    if (!name || !api_url || !api_key_name) {
      return NextResponse.json({ error: 'invalid_payload', detail: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const { data: provider, error } = await sb
      .from('social_providers')
      .update({
        name,
        api_url,
        api_key_name,
        is_active: is_active ?? true,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'duplicate', detail: 'ชื่อ provider นี้มีอยู่แล้ว' }, { status: 400 });
      }
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    if (!provider) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: provider });
  } catch (error) {
    console.error('Update provider error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  
  const { data: userData } = await sb
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const providerId = parseInt(id);

    // ตรวจสอบว่ามี services หรือ orders ที่ใช้ provider นี้หรือไม่
    const [servicesCount, ordersCount] = await Promise.all([
      sb.from('social_services').select('id', { count: 'exact', head: true }).eq('provider_id', providerId),
      sb.from('social_orders').select('id', { count: 'exact', head: true }).eq('provider_id', providerId)
    ]);

    if ((servicesCount.count || 0) > 0 || (ordersCount.count || 0) > 0) {
      return NextResponse.json({ 
        error: 'cannot_delete', 
        detail: 'ไม่สามารถลบ provider นี้ได้ เนื่องจากมี services หรือ orders ที่ใช้งานอยู่' 
      }, { status: 400 });
    }

    const { error } = await sb
      .from('social_providers')
      .delete()
      .eq('id', providerId);

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete provider error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


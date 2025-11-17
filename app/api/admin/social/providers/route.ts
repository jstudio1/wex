import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  
  // ตรวจสอบว่าเป็น admin หรือไม่
  const { data: userData } = await sb
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const { data: providers, error } = await sb
      .from('social_providers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: providers || [] });
  } catch (error) {
    console.error('Get providers error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    if (!name || !api_url || !api_key_name) {
      return NextResponse.json({ error: 'invalid_payload', detail: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const { data: provider, error } = await sb
      .from('social_providers')
      .insert({
        name,
        api_url,
        api_key_name,
        is_active: is_active ?? true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ error: 'duplicate', detail: 'ชื่อ provider นี้มีอยู่แล้ว' }, { status: 400 });
      }
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: provider });
  } catch (error) {
    console.error('Create provider error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


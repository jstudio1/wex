import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { clearApiKeysCache } from '@/lib/api-keys';
import { z } from 'zod';

const getApiKeySchema = z.object({
  key_name: z.string().min(1),
});

const updateApiKeySchema = z.object({
  key_name: z.string().min(1),
  key_value: z.string().min(1),
  description: z.string().optional(),
});

export async function GET(req: Request) {
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
    const { searchParams } = new URL(req.url);
    const key_name = searchParams.get('key_name');

    if (key_name) {
      // ดึง API key เดียว
      const { data, error } = await sb
        .from('api_keys')
        .select('id, key_name, description, created_at, updated_at')
        .eq('key_name', key_name)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }

      return NextResponse.json({ ok: true, data });
    } else {
      // ดึงทุก API keys (ไม่แสดงค่า key_value)
      const { data, error } = await sb
        .from('api_keys')
        .select('id, key_name, description, created_at, updated_at')
        .order('key_name');

      if (error) {
        return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, data });
    }
  } catch (error) {
    console.error('Get API keys error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
    const body = await req.json();
    const parsed = updateApiKeySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', detail: parsed.error.issues }, { status: 400 });
    }

    const { key_name, key_value, description } = parsed.data;

    // อัพเดทหรือสร้างใหม่
    const { data, error } = await sb
      .from('api_keys')
      .upsert({
        key_name,
        key_value,
        description: description || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key_name'
      })
      .select('id, key_name, description, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    // Clear cache เพื่อให้ API ใช้ค่าใหม่ทันที
    clearApiKeysCache();

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('Update API key error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

// GET single API key value (สำหรับ internal use)
export async function PUT(req: Request) {
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
    const body = await req.json();
    const parsed = getApiKeySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', detail: parsed.error.issues }, { status: 400 });
    }

    const { key_name } = parsed.data;

    // ดึง API key value (สำหรับแสดงในหน้า edit)
    const { data, error } = await sb
      .from('api_keys')
      .select('id, key_name, key_value, description, created_at, updated_at')
      .eq('key_name', key_name)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('Get API key value error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}


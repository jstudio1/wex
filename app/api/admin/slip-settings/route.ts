import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  provider: z.enum(['rdcw', 'slipok']).optional(),
  rdcw_client_id: z.string().optional(),
  rdcw_client_secret: z.string().optional(),
  rdcw_endpoint: z.string().url().optional(),
  slipok_branch_id: z.string().optional(),
  slipok_api_key: z.string().optional(),
  minimum_topup_amount: z.number().min(0).optional(),
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
    const { data, error } = await sb
      .from('slip_verification_settings')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Get slip settings DB error:', error);
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    // ถ้ายังไม่มีข้อมูล ส่งค่าว่าง
    if (!data) {
      return NextResponse.json({ 
        ok: true, 
        data: {
          id: null,
          provider: 'rdcw',
          rdcw_client_id: null,
          rdcw_client_secret: null,
          rdcw_endpoint: 'https://suba.rdcw.co.th/v2/inquiry',
          slipok_branch_id: null,
          slipok_api_key: null,
          minimum_topup_amount: 49,
          created_at: null,
          updated_at: null,
        }
      });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('Get slip settings error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'unexpected', detail: errorMessage }, { status: 500 });
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
    const parsed = updateSettingsSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', detail: parsed.error.issues }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.provider !== undefined) {
      updateData.provider = parsed.data.provider;
    }
    if (parsed.data.rdcw_client_id !== undefined) {
      updateData.rdcw_client_id = parsed.data.rdcw_client_id || null;
    }
    if (parsed.data.rdcw_client_secret !== undefined) {
      updateData.rdcw_client_secret = parsed.data.rdcw_client_secret || null;
    }
    if (parsed.data.rdcw_endpoint !== undefined) {
      updateData.rdcw_endpoint = parsed.data.rdcw_endpoint || 'https://suba.rdcw.co.th/v2/inquiry';
    }
    if (parsed.data.slipok_branch_id !== undefined) {
      updateData.slipok_branch_id = parsed.data.slipok_branch_id || null;
    }
    if (parsed.data.slipok_api_key !== undefined) {
      updateData.slipok_api_key = parsed.data.slipok_api_key || null;
    }
    if (parsed.data.minimum_topup_amount !== undefined) {
      updateData.minimum_topup_amount = Number(parsed.data.minimum_topup_amount);
    }

    // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
    const { data: existing, error: checkError } = await sb
      .from('slip_verification_settings')
      .select('id')
      .maybeSingle();

    if (checkError) {
      console.error('Check existing slip settings error:', checkError);
      return NextResponse.json({ error: 'db_error', detail: checkError.message }, { status: 500 });
    }

    let result;
    if (existing) {
      // อัพเดท
      const { data, error } = await sb
        .from('slip_verification_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Update slip settings error:', error);
        return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
      }

      result = data;
    } else {
      // สร้างใหม่
      const { data, error } = await sb
        .from('slip_verification_settings')
        .insert({
          ...updateData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Insert slip settings error:', error);
        return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
      }

      result = data;
    }

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('Update slip settings error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'unexpected', detail: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  // PUT ใช้ logic เดียวกับ POST
  return POST(req);
}


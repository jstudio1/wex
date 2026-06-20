import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const sb = createServiceClient();
    
    // อัพเดตทุกเกมที่ยังไม่เผยแพร่ให้เป็นเผยแพร่
    const { data, error } = await sb
      .from('products')
      .update({ is_published: true })
      .eq('is_published', false)
      .select('id');

    if (error) {
      console.error('Publish all error:', error);
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }
    return NextResponse.json({ 
      ok: true, 
      count: data?.length || 0,
      message: `เผยแพร่ ${data?.length || 0} รายการเรียบร้อย` 
    });
  } catch (err) {
    console.error('Publish all error:', err);
    return NextResponse.json({ error: 'unexpected', detail: String(err) }, { status: 500 });
  }
}


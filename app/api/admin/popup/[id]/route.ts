import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const sb = createServiceClient();
    const { error } = await sb.from('popup_notifications').delete().eq('id', numericId);

    if (error) {
      console.error('Popup delete error:', error);
      return NextResponse.json({ error: 'failed_to_delete' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Popup API exception:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

